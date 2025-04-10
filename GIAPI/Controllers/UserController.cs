using GIAPI.Data; // Добавь пространство имён для GameDbContext
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore; // Для LINQ-запросов
using System.Security.Claims;

namespace GIAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class UserController : ControllerBase
    {
        private readonly GameDbContext _context;

        // Добавляем зависимость от GameDbContext через конструктор
        public UserController(GameDbContext context)
        {
            _context = context;
        }

        [HttpGet("role")]
        public IActionResult GetRole()
        {
            var role = User.FindFirst(ClaimTypes.Role)?.Value ?? "Player";
            return Ok(new { role });
        }

        [HttpGet("search")]
        public IActionResult SearchUsers(string query)
        {
            if (string.IsNullOrEmpty(query)) return BadRequest("Query is required");
            var users = _context.Users
                .Where(u => u.Username.Contains(query))
                .Select(u => new { u.Id, u.Username })
                .Take(10) // Ограничение для оптимизации
                .ToList();
            return Ok(users);
        }
    }
}