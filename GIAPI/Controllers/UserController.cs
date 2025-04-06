using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace GIAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class UserController : ControllerBase
    {
        [HttpGet("role")]
        public IActionResult GetRole()
        {
            var role = User.FindFirst(ClaimTypes.Role)?.Value ?? "Player";
            return Ok(new { role });
        }
    }
}