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
        var bag = new InventoryBag
        {
            OwnerId = userId,
            Name = request.Name,
            Rarity = request.Rarity
        };
        _context.InventoryBags.Add(bag);
        await _context.SaveChangesAsync();
        return Ok(bag.Id);
    }

    // Получить доступные сумки
    [HttpGet]
    public async Task<IActionResult> GetBags()
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        var userRole = User.FindFirst(ClaimTypes.Role)?.Value;

        IQueryable<InventoryBag> query;
        if (userRole == "Admin")
            query = _context.InventoryBags; // Админ видит все сумки
        else
            query = _context.InventoryBags
                .Where(ib => ib.OwnerId == userId || ib.Accesses.Any(a => a.UserId == userId));

        var bags = await query
            .Include(ib => ib.Inventories)
            .ThenInclude(i => i.Item)
            .ThenInclude(i => i.Properties)
            .ToListAsync();

        return Ok(bags.Select(b => new
        {
            b.Id,
            b.Name,
            b.Rarity,
            MaxItems = b.MaxItems,
            IsOwner = b.OwnerId == userId,
            AccessLevel = b.Accesses.FirstOrDefault(a => a.UserId == userId)?.AccessLevel,
            Items = b.Inventories.Select(i => new { i.ItemId, i.Item.Name, i.Quantity })
        }));
    }

    // Добавить предмет в сумку
    [HttpPost("add")]
    public async Task<IActionResult> AddItem([FromBody] AddItemRequest request)
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        var userRole = User.FindFirst(ClaimTypes.Role)?.Value;
        var bag = await CheckAccess(request.InventoryBagId, userId, userRole, fullEdit: true);
        if (bag == null) return Forbid();

        if (bag.Inventories.Sum(i => i.Quantity) >= bag.MaxItems)
            return BadRequest("Bag is full");

        var item = await _context.Items.FindAsync(request.ItemId);
        if (item == null) return BadRequest("Item not found");

        var existing = bag.Inventories.FirstOrDefault(i => i.ItemId == request.ItemId);
        if (existing != null)
            existing.Quantity++;
        else
            bag.Inventories.Add(new Inventory { ItemId = request.ItemId, Quantity = 1 });

        await _context.SaveChangesAsync();
        return Ok();
    }

    // Переложить предмет в другую сумку
    [HttpPost("move")]
    public async Task<IActionResult> MoveItem([FromBody] MoveItemRequest request)
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        var userRole = User.FindFirst(ClaimTypes.Role)?.Value;

        var fromBag = await CheckAccess(request.FromBagId, userId, userRole, fullEdit: true);
        var toBag = await CheckAccess(request.ToBagId, userId, userRole, fullEdit: true);
        if (fromBag == null || toBag == null) return Forbid();

        var item = fromBag.Inventories.FirstOrDefault(i => i.ItemId == request.ItemId);
        if (item == null) return NotFound("Item not in source bag");

        if (toBag.Inventories.Sum(i => i.Quantity) >= toBag.MaxItems)
            return BadRequest("Target bag is full");

        if (item.Quantity > 1)
            item.Quantity--;
        else
            fromBag.Inventories.Remove(item);

        var toItem = toBag.Inventories.FirstOrDefault(i => i.ItemId == request.ItemId);
        if (toItem != null)
            toItem.Quantity++;
        else
            toBag.Inventories.Add(new Inventory { ItemId = request.ItemId, Quantity = 1 });

        await _context.SaveChangesAsync();
        return Ok();
    }

    // Удалить предмет из сумки
    [HttpDelete("remove/{bagId}/{itemId}")]
    public async Task<IActionResult> RemoveItem(int bagId, int itemId)
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        var userRole = User.FindFirst(ClaimTypes.Role)?.Value;
        var bag = await CheckAccess(bagId, userId, userRole, fullEdit: true);
        if (bag == null) return Forbid();

        var item = bag.Inventories.FirstOrDefault(i => i.ItemId == itemId);
        if (item == null) return NotFound("Item not in bag");

        if (item.Quantity > 1)
            item.Quantity--;
        else
            bag.Inventories.Remove(item);

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
        if (access == null) return null;
        return (!fullEdit || access.AccessLevel == AccessLevel.FullEdit) ? bag : null;
    }
}

public class CreateBagRequest
{
    public required string Name { get; set; }
    public Rarity Rarity { get; set; }
}

public class AddItemRequest
{
    public int InventoryBagId { get; set; }
    public int ItemId { get; set; }
}

public class MoveItemRequest
{
    public int FromBagId { get; set; }
    public int ToBagId { get; set; }
    public int ItemId { get; set; }
}