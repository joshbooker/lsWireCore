using System.Web.Http;

namespace LightSwitchApplication
{
    public class WebApiConfig
    {
        public static void Register(HttpConfiguration config)
        {
            config.MapHttpAttributeRoutes();

			// Create our route for our Web API
			// This route provides a functional RPC
            config.Routes.MapHttpRoute(
                name: "api",
                routeTemplate: "api/{controller}/{action}/{id}/{param}",
                defaults: new
                {
                    id = RouteParameter.Optional,
                    param = RouteParameter.Optional
                }
            );


        }
    }
}