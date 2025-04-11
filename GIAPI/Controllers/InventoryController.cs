using GIAPI.Data;
using GIAPI.Models;
using GIAPI.Models.ItemModel;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

[Route("api/[controller]")]
[ApiController]
[Authorize]
public class InventoryController : ControllerBase
{
    private readonly GameDbContext _context;

    public InventoryController(GameDbContext context)
    {
        _context = context;
    }

    // Создать сумку
    [HttpPost("create")]
    public async Task<IActionResult> CreateBag([FromBody] CreateBagRequest request)
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        var userRole = User.FindFirst(ClaimTypes.Role)?.Value ?? "Player";
        var rarity = Enum.Parse<Rarity>(request.Rarity, ignoreCase: true);

        bool isAllowed = userRole switch
        {
            "Admin" => true,
            "Moderator" => rarity <= Rarity.Legendary,
            "Player" => rarity <= Rarity.Epic,
            _ => false
        };

        if (!isAllowed) return Forbid("Insufficient role to create bag of this rarity");

        var bag = new InventoryBag
        {
            OwnerId = userId,
            Name = request.Name,
            Rarity = rarity
        };
        _context.InventoryBags.Add(bag);
        await _context.SaveChangesAsync();
        return Ok(bag.Id);
    }

    [HttpGet]
    public async Task<IActionResult> GetInventory()
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        var bags = await _context.InventoryBags
            .Where(b => b.OwnerId == userId || b.Accesses.Any(a => a.UserId == userId))
            .Select(b => new
            {
                b.Id,
                b.Name,
                b.Rarity,
                Items = b.Inventories.Select(i => new { i.ItemId, i.Quantity, i.Item.Name })
            })
            .ToListAsync();
        return Ok(bags);
    }

    // Получить доступные сумки
    [HttpGet("bags")]
    public async Task<IActionResult> GetBags()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null) return Unauthorized("User ID not found in token");
        var userId = int.Parse(userIdClaim.Value);
        var userRoleString = User.FindFirst(ClaimTypes.Role)?.Value ?? "Player";
        var userRole = Enum.Parse<Role>(userRoleString, ignoreCase: true);

        IQueryable<InventoryBag> query = _context.InventoryBags
            .Where(ib => ib.OwnerId == userId || ib.Accesses.Any(a => a.UserId == userId));

        var bags = await query
            .Select(b => new
            {
                b.Id,
                b.Name,
                b.Rarity,
                MaxItems = b.MaxItems,
                IsOwner = b.OwnerId == userId,
                AccessLevelId = b.Accesses.FirstOrDefault(a => a.UserId == userId) != null
                    ? b.Accesses.FirstOrDefault(a => a.UserId == userId).AccessLevel
                    : (AccessLevel?)null,
                Items = b.Inventories.Select(i => new
                {
                    i.ItemId,
                    i.Item.Name,
                    i.Quantity
                }).ToList()
            })
            .ToListAsync();

        var result = bags.Select(b => new
        {
            b.Id,
            b.Name,
            b.Rarity,
            b.MaxItems,
            b.IsOwner,
            AccessLevel = b.AccessLevelId.HasValue ? b.AccessLevelId.Value.ToString() : null,
            b.Items
        });

        return Ok(result);
    }

    // Предоставить доступ к сумке другому игроку
    [HttpPost("share")]
    public async Task<IActionResult> ShareBag([FromBody] ShareBagRequest request)
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        var userRole = User.FindFirst(ClaimTypes.Role)?.Value;
        var bag = await CheckAccess(request.InventoryBagId, userId, userRole, fullEdit: true);
        if (bag == null) return Forbid();

        var targetUser = await _context.Users.FindAsync(request.TargetUserId);
        if (targetUser == null) return BadRequest("Target user not found");

        // Проверяем, не пытается ли пользователь поделиться с самим собой
        if (targetUser.Id == userId) return BadRequest("Cannot share with yourself");

        // Проверяем, нет ли уже доступа
        var existingAccess = bag.Accesses.FirstOrDefault(a => a.UserId == request.TargetUserId);
        if (existingAccess != null) return BadRequest("User already has access to this bag");

        // Добавляем новый доступ
        var access = new InventoryBagAccess
        {
            InventoryBagId = request.InventoryBagId,
            UserId = request.TargetUserId,
            AccessLevel = Enum.Parse<AccessLevel>(request.AccessLevel, true)
        };
        bag.Accesses.Add(access);
        await _context.SaveChangesAsync();

        return Ok();
    }

    // Передать сумку другому пользователю
    [HttpPost("transfer")]
    public async Task<IActionResult> TransferBag([FromBody] TransferBagRequest request)
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        var bag = await CheckAccess(request.InventoryBagId, userId, User.FindFirst(ClaimTypes.Role)?.Value, fullEdit: true);
        if (bag == null) return Forbid();

        var newOwner = await _context.Users.FindAsync(request.NewOwnerId);
        if (newOwner == null) return BadRequest("User not found");

        bag.OwnerId = request.NewOwnerId;
        bag.Owner = newOwner;
        await _context.SaveChangesAsync();
        return Ok();
    }

    // Добавить предмет в сумку
    [HttpPost("add")]
    public async Task<IActionResult> AddItem([FromBody] AddItemRequest request)
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        var userRole = User.FindFirst(ClaimTypes.Role)?.Value;

        var bag = await CheckAccess(request.InventoryBagId, userId, userRole, fullEdit: true);
        if (bag == null) return Forbid("Insufficient access to edit bag");

        var item = await _context.Items.FindAsync(request.ItemId);
        if (item == null) return BadRequest("Item not found");

        var existingItem = bag.Inventories.FirstOrDefault(i => i.ItemId == request.ItemId);
        if (existingItem != null)
        {
            existingItem.Quantity += request.Quantity; // Увеличиваем на переданное количество
        }
        else
        {
            bag.Inventories.Add(new Inventory
            {
                ItemId = request.ItemId,
                Quantity = request.Quantity // Используем переданное количество
            });
        }

        await _context.SaveChangesAsync();
        return Ok();
    }

    // Поиск сумок по имени
    [HttpGet("search-all-bags")]
    [Authorize]
    public IActionResult SearchAllBags(string query)
    {
        var bags = _context.InventoryBags
            .Where(b => b.Name.Contains(query))
            .Select(b => new { b.Id, b.Name, OwnerUsername = b.OwnerId })
            .ToList();
        return Ok(bags);
    }

    // Переложить предмет в другую сумку
    [HttpPost("move")]
    public async Task<IActionResult> MoveItem([FromBody] MoveItemRequest request)
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        var userRole = User.FindFirst(ClaimTypes.Role)?.Value;

        var fromBag = await CheckAccess(request.FromBagId, userId, userRole, fullEdit: true); // Требуем полный доступ
        var toBag = await CheckAccess(request.ToBagId, userId, userRole, fullEdit: true); // Требуем полный доступ
        if (fromBag == null || toBag == null) return Forbid("Insufficient access to one or both bags");

        var item = fromBag.Inventories.FirstOrDefault(i => i.ItemId == request.ItemId);
        if (item == null || item.Quantity < request.Quantity) return BadRequest("Invalid item or quantity");

        item.Quantity -= request.Quantity;
        if (item.Quantity == 0) _context.Inventories.Remove(item);

        var toItem = toBag.Inventories.FirstOrDefault(i => i.ItemId == request.ItemId);
        if (toItem != null)
        {
            toItem.Quantity += request.Quantity;
        }
        else
        {
            toBag.Inventories.Add(new Inventory { ItemId = request.ItemId, Quantity = request.Quantity });
        }

        await _context.SaveChangesAsync();
        return Ok();
    }

    // Удалить предмет из сумки
    [HttpDelete("remove/{bagId}/{itemId}")]
    public async Task<IActionResult> RemoveItem(int bagId, int itemId, [FromBody] RemoveItemRequest request)
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        var userRole = User.FindFirst(ClaimTypes.Role)?.Value;

        var bag = await CheckAccess(bagId, userId, userRole, fullEdit: true); // Требуем полный доступ
        if (bag == null) return Forbid("Insufficient access to edit bag");

        var item = bag.Inventories.FirstOrDefault(i => i.ItemId == itemId);
        if (item == null || item.Quantity < request.Quantity) return BadRequest("Invalid item or quantity");

        item.Quantity -= request.Quantity;
        if (item.Quantity == 0) _context.Inventories.Remove(item);
        await _context.SaveChangesAsync();
        return Ok();
    }

    // Удалить сумку
    [HttpDelete("delete/{bagId}")]
    public async Task<IActionResult> DeleteBag(int bagId)
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        var userRole = User.FindFirst(ClaimTypes.Role)?.Value;
        var bag = await CheckAccess(bagId, userId, userRole, fullEdit: true);
        if (bag == null) return Forbid();

        _context.InventoryBags.Remove(bag);
        await _context.SaveChangesAsync();
        return Ok();
    }

    private async Task<InventoryBag?> CheckAccess(int bagId, int userId, string? role, bool fullEdit = false)
    {
        var bag = await _context.InventoryBags
            .Include(ib => ib.Inventories)
            .Include(ib => ib.Accesses)
            .FirstOrDefaultAsync(ib => ib.Id == bagId);

        if (bag == null) return null;
        if (role == "Admin") return bag; // Админ имеет полный доступ
        if (bag.OwnerId == userId) return bag; // Владелец имеет полный доступ

        var access = bag.Accesses.FirstOrDefault(a => a.UserId == userId);
        if (access == null) return null; // Нет доступа
        if (fullEdit && access.AccessLevel == AccessLevel.ViewOnly) return null; // ViewOnly не подходит для редактирования

        return bag; // Доступ есть, и он достаточен
    }
}

public class ShareBagRequest
{
    public int InventoryBagId { get; set; }
    public int TargetUserId { get; set; }
    public string AccessLevel { get; set; } = null!;
}

public class CreateBagRequest
{
    public required string Name { get; set; }
    public required string Rarity { get; set; }
}

public class AddItemRequest
{
    public int InventoryBagId { get; set; }
    public int ItemId { get; set; }
    public int Quantity { get; set; } // Убираем nullable, так как количество обязательно
}

public class MoveItemRequest
{
    public int FromBagId { get; set; }
    public int ToBagId { get; set; }
    public int ItemId { get; set; }
    public int Quantity { get; set; }
}

public class RemoveItemRequest
{
    public int Quantity { get; set; }
}

public class TransferBagRequest
{
    public int InventoryBagId { get; set; }
    public int NewOwnerId { get; set; }
}
