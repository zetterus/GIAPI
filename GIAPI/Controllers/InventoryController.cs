using GIAPI.Data;
using GIAPI.Models;
using GIAPI.Models.ItemModel;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GIAPI.Controllers
{
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
            var userId = int.Parse(User.FindFirst("sub")?.Value ?? "0");
            var userRole = User.FindFirst("role")?.Value ?? "2"; // Player = 2
            if (userId == 0) return Unauthorized("Invalid user ID");

            var rarity = Enum.Parse<Rarity>(request.Rarity, true);
            bool isAllowed = userRole switch
            {
                "0" => true, // Admin
                "1" => rarity <= Rarity.Legendary, // Moderator
                "2" => rarity <= Rarity.Epic, // Player
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

        public class CreateBagRequest
        {
            public required string Name { get; set; }
            public required string Rarity { get; set; }
        }

        // Получить инвентарь
        [HttpGet]
        public async Task<IActionResult> GetInventory()
        {
            var userId = int.Parse(User.FindFirst("sub")?.Value ?? "0");
            if (userId == 0) return Unauthorized("Invalid user ID");

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
            var userId = int.Parse(User.FindFirst("sub")?.Value ?? "0");
            if (userId == 0) return Unauthorized("Invalid user ID");

            var bags = await _context.InventoryBags
                .Where(ib => ib.OwnerId == userId || ib.Accesses.Any(a => a.UserId == userId))
                .Select(b => new
                {
                    b.Id,
                    b.Name,
                    b.Rarity,
                    b.MaxItems,
                    IsOwner = b.OwnerId == userId,
                    AccessLevel = b.Accesses
                        .Where(a => a.UserId == userId)
                        .Select(a => a.AccessLevel.ToString())
                        .FirstOrDefault(),
                    Items = b.Inventories.Select(i => new
                    {
                        i.ItemId,
                        i.Item.Name,
                        i.Quantity
                    })
                })
                .ToListAsync();

            return Ok(bags);
        }

        // Предоставить доступ к сумке
        [HttpPost("share")]
        public async Task<IActionResult> ShareBag([FromBody] ShareBagRequest request)
        {
            var userId = int.Parse(User.FindFirst("sub")?.Value ?? "0");
            if (userId == 0) return Unauthorized("Invalid user ID");

            var userRole = User.FindFirst("role")?.Value;
            var bag = await CheckAccess(request.InventoryBagId, userId, userRole, true);
            if (bag == null) return Forbid("Insufficient access");

            var targetUser = await _context.Users.FindAsync(request.TargetUserId);
            if (targetUser == null) return BadRequest("Target user not found");
            if (targetUser.Id == userId) return BadRequest("Cannot share with yourself");

            var existingAccess = bag.Accesses.FirstOrDefault(a => a.UserId == request.TargetUserId);
            if (existingAccess != null) return BadRequest("User already has access");

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

        public class ShareBagRequest
        {
            public int InventoryBagId { get; set; }
            public int TargetUserId { get; set; }
            public required string AccessLevel { get; set; }
        }

        // Передать сумку (пользователь)
        [HttpPost("transfer")]
        public async Task<IActionResult> TransferBag([FromBody] TransferBagRequest request)
        {
            var userId = int.Parse(User.FindFirst("sub")?.Value ?? "0");
            if (userId == 0) return Unauthorized("Invalid user ID");

            var userRole = User.FindFirst("role")?.Value;
            var bag = await CheckAccess(request.InventoryBagId, userId, userRole, true);
            if (bag == null) return Forbid("Insufficient access");

            var newOwner = await _context.Users.FindAsync(request.NewOwnerId);
            if (newOwner == null) return BadRequest("User not found");

            bag.OwnerId = request.NewOwnerId;
            bag.Owner = newOwner;
            await _context.SaveChangesAsync();
            return Ok();
        }

        public class TransferBagRequest
        {
            public int InventoryBagId { get; set; }
            public int NewOwnerId { get; set; }
        }

        // Добавить предмет
        [HttpPost("add")]
        public async Task<IActionResult> AddItem([FromBody] AddItemRequest request)
        {
            var userId = int.Parse(User.FindFirst("sub")?.Value ?? "0");
            if (userId == 0) return Unauthorized("Invalid user ID");

            var userRole = User.FindFirst("role")?.Value;
            var bag = await CheckAccess(request.InventoryBagId, userId, userRole, true);
            if (bag == null) return Forbid("Insufficient access");

            var item = await _context.Items.FindAsync(request.ItemId);
            if (item == null) return BadRequest("Item not found");

            var existingItem = bag.Inventories.FirstOrDefault(i => i.ItemId == request.ItemId);
            if (existingItem != null)
            {
                existingItem.Quantity += request.Quantity;
            }
            else
            {
                bag.Inventories.Add(new Inventory
                {
                    ItemId = request.ItemId,
                    Quantity = request.Quantity
                });
            }

            await _context.SaveChangesAsync();
            return Ok();
        }


        public class AddItemRequest
        {
            public int InventoryBagId { get; set; }
            public int ItemId { get; set; }
            public int Quantity { get; set; }
        }

        // Поиск сумок
        [HttpGet("search-all-bags")]
        public async Task<IActionResult> SearchAllBags([FromQuery] string? query)
        {
            var userId = int.Parse(User.FindFirst("sub")?.Value ?? "0");
            if (userId == 0) return Unauthorized("Invalid user ID");

            var bags = await _context.InventoryBags
                .Include(b => b.Owner)
                .Where(b => b.OwnerId == userId || b.Accesses.Any(a => a.UserId == userId))
                .Where(b => string.IsNullOrEmpty(query) || b.Name.Contains(query))
                .Select(b => new
                {
                    b.Id,
                    b.Name,
                    OwnerUsername = b.Owner != null ? b.Owner.Username : "Unknown"
                })
                .ToListAsync();

            return Ok(bags);
        }

        // Переложить предмет
        [HttpPost("move")]
        public async Task<IActionResult> MoveItem([FromBody] MoveItemRequest request)
        {
            var userId = int.Parse(User.FindFirst("sub")?.Value ?? "0");
            if (userId == 0) return Unauthorized("Invalid user ID");

            var userRole = User.FindFirst("role")?.Value;
            var fromBag = await CheckAccess(request.FromBagId, userId, userRole, true);
            var toBag = await CheckAccess(request.ToBagId, userId, userRole, true);
            if (fromBag == null || toBag == null) return Forbid("Insufficient access");

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
                toBag.Inventories.Add(new Inventory
                {
                    ItemId = request.ItemId,
                    Quantity = request.Quantity
                });
            }

            await _context.SaveChangesAsync();
            return Ok();
        }

        public class MoveItemRequest
        {
            public int FromBagId { get; set; }
            public int ToBagId { get; set; }
            public int ItemId { get; set; }
            public int Quantity { get; set; }
        }

        // Удалить предмет
        [HttpDelete("remove/{bagId}/{itemId}")]
        public async Task<IActionResult> RemoveItem(int bagId, int itemId, [FromBody] RemoveItemRequest request)
        {
            var userId = int.Parse(User.FindFirst("sub")?.Value ?? "0");
            if (userId == 0) return Unauthorized("Invalid user ID");

            var userRole = User.FindFirst("role")?.Value;
            var bag = await CheckAccess(bagId, userId, userRole, true);
            if (bag == null) return Forbid("Insufficient access");

            var item = bag.Inventories.FirstOrDefault(i => i.ItemId == itemId);
            if (item == null || item.Quantity < request.Quantity) return BadRequest("Invalid item or quantity");

            item.Quantity -= request.Quantity;
            if (item.Quantity == 0) _context.Inventories.Remove(item);
            await _context.SaveChangesAsync();
            return Ok();
        }

        public class RemoveItemRequest
        {
            public int Quantity { get; set; }
        }

        // Удалить сумку (пользователь)
        [HttpDelete("delete/{bagId}")]
        public async Task<IActionResult> DeleteBag(int bagId)
        {
            var userId = int.Parse(User.FindFirst("sub")?.Value ?? "0");
            if (userId == 0) return Unauthorized("Invalid user ID");

            var userRole = User.FindFirst("role")?.Value;
            var bag = await CheckAccess(bagId, userId, userRole, true);
            if (bag == null) return Forbid("Insufficient access");

            _context.InventoryBags.Remove(bag);
            await _context.SaveChangesAsync();
            return Ok();
        }

        // Админ: Поиск сумок
        [HttpGet("admin/search-bags")]
        [Authorize(Roles = "0")]
        public async Task<IActionResult> AdminSearchBags([FromQuery] string? query)
        {
            var bags = await _context.InventoryBags
                .Include(b => b.Owner)
                .Where(b => string.IsNullOrEmpty(query) ||
                            b.Name.Contains(query) ||
                            (b.Owner != null && b.Owner.Username.Contains(query)))
                .Select(b => new
                {
                    b.Id,
                    b.Name,
                    OwnerUsername = b.Owner != null ? b.Owner.Username : "Unknown"
                })
                .ToListAsync();

            return Ok(bags);
        }

        // Админ: Список сумок
        [HttpGet("admin/list-bags")]
        [Authorize(Roles = "0")]
        public async Task<IActionResult> AdminListBags([FromQuery] int page = 1, [FromQuery] int pageSize = 10)
        {
            var totalBags = await _context.InventoryBags.CountAsync();
            var totalPages = (int)Math.Ceiling(totalBags / (double)pageSize);

            var bags = await _context.InventoryBags
                .Include(b => b.Owner)
                .Include(b => b.Accesses)
                .ThenInclude(a => a.User)
                .OrderBy(b => b.Id)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(b => new
                {
                    b.Id,
                    b.Name,
                    OwnerUsername = b.Owner != null ? b.Owner.Username : "Unknown",
                    Accesses = b.Accesses.Select(a => new
                    {
                        Username = a.User.Username,
                        AccessLevel = a.AccessLevel == AccessLevel.FullEdit ? "FullEdit" : "ViewOnly"
                    })
                })
                .ToListAsync();

            return Ok(new { Bags = bags, TotalPages = totalPages });
        }

        // Админ: Содержимое сумки
        [HttpGet("admin/bag-contents/{id}")]
        [Authorize(Roles = "0")]
        public async Task<IActionResult> AdminGetBagContents(int id)
        {
            var bag = await _context.InventoryBags
                .Include(b => b.Inventories)
                .ThenInclude(i => i.Item)
                .Include(b => b.Owner)
                .FirstOrDefaultAsync(b => b.Id == id);

            if (bag == null) return NotFound("Bag not found");

            return Ok(new
            {
                bag.Id,
                bag.Name,
                OwnerUsername = bag.Owner != null ? bag.Owner.Username : "Unknown",
                Items = bag.Inventories.Select(i => new
                {
                    i.ItemId,
                    Name = i.Item != null ? i.Item.Name : "Unknown",
                    i.Quantity
                })
            });
        }

        // Админ: Удалить сумку
        [HttpDelete("admin/delete-bag/{id}")]
        [Authorize(Roles = "0")]
        public async Task<IActionResult> AdminDeleteBag(int id)
        {
            var bag = await _context.InventoryBags.FindAsync(id);
            if (bag == null) return NotFound("Bag not found");

            _context.InventoryBags.Remove(bag);
            await _context.SaveChangesAsync();
            return Ok();
        }

        // Админ: Передать сумку
        [HttpPost("admin/transfer-bag")]
        [Authorize(Roles = "0")]
        public async Task<IActionResult> AdminTransferBag([FromBody] TransferBagRequest request)
        {
            var bag = await _context.InventoryBags.FindAsync(request.InventoryBagId);
            if (bag == null) return NotFound("Bag not found");

            var newOwner = await _context.Users.FindAsync(request.NewOwnerId);
            if (newOwner == null) return BadRequest("User not found");

            bag.OwnerId = request.NewOwnerId;
            await _context.SaveChangesAsync();
            return Ok();
        }

        private async Task<InventoryBag?> CheckAccess(int bagId, int userId, string? userRole, bool fullEdit = false)
        {
            var bag = await _context.InventoryBags
                .Include(b => b.Inventories)
                .ThenInclude(i => i.Item)
                .Include(b => b.Accesses)
                .Include(b => b.Owner)
                .FirstOrDefaultAsync(b => b.Id == bagId);

            if (bag == null) return null;
            if (userRole == "0") return bag; // Admin
            if (bag.OwnerId == userId) return bag;

            var access = bag.Accesses.FirstOrDefault(a => a.UserId == userId);
            if (access == null || (fullEdit && access.AccessLevel == AccessLevel.ViewOnly)) return null;

            return bag;
        }

        // В InventoryController.cs, после AdminTransferBag
        [HttpPost("admin/update-bag")]
        [Authorize(Roles = "0")]
        public async Task<IActionResult> AdminUpdateBag([FromBody] UpdateBagRequest request)
        {
            var bag = await _context.InventoryBags.FindAsync(request.InventoryBagId);
            if (bag == null) return NotFound("Bag not found");

            bag.Name = request.Name;
            bag.Rarity = Enum.Parse<Rarity>(request.Rarity, true);
            await _context.SaveChangesAsync();
            return Ok();
        }

        public class UpdateBagRequest
        {
            public int InventoryBagId { get; set; }
            public required string Name { get; set; }
            public required string Rarity { get; set; }
        }
    }
}