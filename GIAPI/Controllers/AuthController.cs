using GIAPI.Data;
using GIAPI.DTO;
using GIAPI.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace GIAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly GameDbContext _context;
        private readonly IConfiguration _config;

        public AuthController(GameDbContext context, IConfiguration config)
        {
            _context = context;
            _config = config;
        }

        [HttpPost("register")]
        public IActionResult Register([FromBody] RegisterDto dto)
        {
            if (_context.Users.Any(u => u.Username == dto.Username))
                return BadRequest(new { Message = "Username already exists" });

            var user = new User
            {
                Username = dto.Username,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
                Role = Role.Player
            };

            _context.Users.Add(user);
            _context.SaveChanges();

            var token = GenerateJwtToken(user);
            return Ok(new { Token = token, Role = ((int)user.Role).ToString() });
        }

        [HttpPost("login")]
        public IActionResult Login([FromBody] RegisterDto dto)
        {
            var user = _context.Users.FirstOrDefault(u => u.Username == dto.Username);
            if (user == null || !BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
                return Unauthorized(new { Message = "Invalid username or password" });

            var token = GenerateJwtToken(user);
            return Ok(new { Token = token, Role = ((int)user.Role).ToString() });
        }

        [HttpGet("verify")]
        [Authorize]
        public IActionResult VerifyToken()
        {
            var username = User.FindFirst("name")?.Value;
            var role = User.FindFirst("role")?.Value;
            return Ok(new { Username = username, Role = role });
        }

        private string GenerateJwtToken(User user)
        {
            var claims = new[]
            {
                new Claim("sub", user.Id.ToString()),
                new Claim("name", user.Username),
                new Claim("role", ((int)user.Role).ToString()) // Числовое значение роли
            };

            var jwtKey = _config["Jwt:Key"];
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var token = new JwtSecurityToken(
                issuer: _config["Jwt:Issuer"],
                audience: _config["Jwt:Audience"],
                claims: claims,
                expires: DateTime.UtcNow.AddHours(1),
                signingCredentials: creds);

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}