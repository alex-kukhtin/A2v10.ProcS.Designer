using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using A2v10.ProcS.Designer.Models;
using System.IO;

namespace A2v10.ProcS.Designer.Controllers
{
	public class HomeController : Controller
	{
		private readonly ILogger<HomeController> _logger;

		public HomeController(ILogger<HomeController> logger)
		{
			_logger = logger;
		}

		public IActionResult Index()
		{
			String content = System.IO.File.ReadAllText(Path.GetFullPath("./Workflows/simple.json"));
			String xmlConfig = System.IO.File.ReadAllText(Path.GetFullPath("./Config/editor.config.xml"));

			var m = new WorkflowModel()
			{
				ModelJson = content,
				EditorConfigXml = xmlConfig
			};
			return View("Editor", m);
		}

		public IActionResult Index2()
		{
			String content = System.IO.File.ReadAllText(Path.GetFullPath("./Workflows/simple.json"));
			String xmlConfig = System.IO.File.ReadAllText(Path.GetFullPath("./Config/editor.config.xml"));

			var m = new WorkflowModel()
			{
				ModelJson = content,
				EditorConfigXml = xmlConfig
			};
			return View(m);
		}

		public IActionResult Privacy()
		{
			return View();
		}

		[ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
		public IActionResult Error()
		{
			return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
		}
	}
}
