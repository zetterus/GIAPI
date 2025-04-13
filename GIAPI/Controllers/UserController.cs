using GIAPI.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GIAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class UserController : ControllerBase
    {
        private readonly GameDbContext _context;

        public UserController(GameDbContext context)
        {
            _context = context;
        }

        [HttpGet("role")]
        public IActionResult GetRole()
        {
            var role = User.FindFirst("role")?.Value ?? "2";
            return Ok(new { role });
        }

        [HttpGet("search")]
        public IActionResult SearchUsers([FromQuery] string query)
        {
            if (string.IsNullOrEmpty(query))
                return BadRequest(new { error = "Query is required" });
            try
            {
                var users = _context.Users
                    .Where(u => u.Username.Contains(query))
                    .Select(u => new { u.Id, u.Username })
                    .Take(10)
                    .ToList();
                return Ok(users);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = $"Internal server error: {ex.Message}" });
            }
        }
    }
}