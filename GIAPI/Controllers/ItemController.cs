using GIAPI.Data;
using GIAPI.Models;
using GIAPI.Models.ItemModel;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

[Route("api/[controller]")]
[ApiController]
[Authorize] // Общий доступ для авторизованных пользователей
public class ItemController : ControllerBase
{
    private readonly GameDbContext _context;

    public ItemController(GameDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetItems([FromQuery] string? query)
    {
        var items = string.IsNullOrEmpty(query)
            ? await _context.Items.ToListAsync()
            : await _context.Items
                .Where(i => i.Name.Contains(query))
                .ToListAsync();
        return Ok(items.Select(i => new { i.Id, i.Name })); // Возвращаем только Id и Name для поиска
    }

    [HttpPost("create")]
    [Authorize(Roles = "Admin")] // Оставляем ограничение для админов
    public async Task<IActionResult> CreateItem([FromBody] CreateItemRequest request)
    {
        var item = new Item
        {
            Name = request.Name,
            Type = request.Type,
            Level = request.Level,
            Rarity = request.Rarity,
            Attack = request.Attack,
            Defense = request.Defense,
            Health = request.Health,
            Properties = request.Properties.Select(p => new ItemProperty
            {
                Key = p.Key,
                Value = p.Value
            }).ToList()
        };

        _context.Items.Add(item);
        await _context.SaveChangesAsync();
        return Ok(item.Id);
    }
}

public class CreateItemRequest
{
    public required string Name { get; set; }
    public ItemType Type { get; set; }
    public int Level { get; set; }
    public Rarity Rarity { get; set; }
    public int Attack { get; set; }
    public int Defense { get; set; }
    public int Health { get; set; }
    public List<ItemPropertyRequest> Properties { get; set; } = new();
}

public class ItemPropertyRequest
{
    public required string Key { get; set; }
    public required string Value { get; set; }
}