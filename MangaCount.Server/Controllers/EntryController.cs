using Microsoft.AspNetCore.Mvc;

namespace MangaCount.Server.Controllers
{
    public class EntryController : Controller
    {
        public IActionResult Index()
        {
            return View();
        }
    }
}
