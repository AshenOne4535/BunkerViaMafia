using Microsoft.AspNetCore.Mvc;

namespace Bunker.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class RoomsController : ControllerBase
{
    [HttpGet("ping")]
    public IActionResult Ping()
    {
        return Ok(new { message = "Backend is working!" });
    }
}