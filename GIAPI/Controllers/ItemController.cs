using GIAPI.Data;
using GIAPI.Models;
using GIAPI.Models.ItemModel;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

[Route("api/[controller]")]
[ApiController]
[Authorize(Roles = "Admin")]
public class ItemController : ControllerBase
{
    private readonly GameDbContext _context;

    public ItemController(GameDbContext context)
    {
        _context = context;
    }

    [HttpPost("create")]
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