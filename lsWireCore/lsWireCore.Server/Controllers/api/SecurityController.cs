using System;
using System.Collections.Generic;
using System.Linq;
using System.Web.Http;
using Microsoft.LightSwitch.Security.Server;

namespace LightSwitchApplication.Controllers.api
{
    public class SecurityController : ApiController
    {
        // GET api/Security/GetUserInfo
        // =========================================================================
        [AcceptVerbs("GET")]
        public Dictionary<string, object> GetUserInfo()
        {
            var userInfo = new Dictionary<string, object>();

            using (ServerApplicationContext ctx = ServerApplicationContext.Current ?? ServerApplicationContext.CreateContext())
            {
                var currentUser = ctx.Application.User;
                if (currentUser.IsAuthenticated)
                {

                    userInfo.Add("UserName", currentUser.Name);
                    userInfo.Add("FullName", currentUser.FullName);
                    userInfo.Add("Permissions", getUserPermissions(ctx));
                    userInfo.Add("Roles", getUserRoles(ctx));
                }
            }
            return userInfo;
        }


        // GET api/Security/userHasPermission/LightSwitchApplication:Delete
        // =========================================================================
        [AcceptVerbs("GET")]
        public Boolean userHasPermission(string Id)
        {
            var result = false;

            using (ServerApplicationContext ctx = ServerApplicationContext.Current ?? ServerApplicationContext.CreateContext())
            {
                var currentUser = ctx.Application.User;
                if (currentUser.IsAuthenticated)
                {
                    result = (from x in currentUser.EffectivePermissions
                              where x.Split(':')[1].ToLower() == Id.ToLower()
                              select x).Any();
                }
            }
            return result;
        }

        // GET api/Security/userHasRole/Admin
        // =========================================================================
        [AcceptVerbs("GET")]
        public Boolean userHasRole(string Id)
        {
            var result = false;

            using (ServerApplicationContext ctx = ServerApplicationContext.Current ?? ServerApplicationContext.CreateContext())
            {
                var currentUser = ctx.Application.User;
                if (currentUser.IsAuthenticated)
                {
                    result = (from x in currentUser.Roles
                              where x.ToLower() == Id.ToLower()
                              select x).Any();

                }
            }
            return result;
        }


        // GET api/Security/GetAppSecurityObjects
        // =========================================================================
        [AcceptVerbs("GET")]
        public Dictionary<string, object> GetAppSecurityObjects()
        {
            var appSecurityInfo = new Dictionary<string, object>();

            using (ServerApplicationContext ctx = ServerApplicationContext.Current ?? ServerApplicationContext.CreateContext())
            {
                var currentUser = ctx.Application.User;
                var removeAdminPermission = false;

                if (currentUser.IsAuthenticated)
                {
                    // Temporarily raise permissions
                    if (!currentUser.HasPermission(Permissions.SecurityAdministration))
                    {
                        removeAdminPermission = true;
                        currentUser.AddPermissions(Permissions.SecurityAdministration);
                    }

                    // Get all the roles for this app
                    var roleList = (from Microsoft.LightSwitch.Security.Role role in ctx.DataWorkspace.SecurityData.Roles select role.Name).ToList();

                    // Now get all the permissions for the app
                    var permissionList = ctx.DataWorkspace.SecurityData.Permissions.GetQuery().Execute().Select(x => x.Id.Split(':')[1]).ToList();

                    // Don't forget to drop permission if necessary
                    if (removeAdminPermission) currentUser.RemovePermissions(Permissions.SecurityAdministration);

                    appSecurityInfo.Add("Roles", roleList);
                    appSecurityInfo.Add("Permissions", permissionList);
                }

            }
            return appSecurityInfo;
        }


        // Internal - Get dictionary of all the roles and whether user is in the role
        // =========================================================================
        private List<string> getUserRoles(ServerApplicationContext ctx)
        {
            var roles = new List<string>();

            var currentUser = ctx.Application.User;
            var removeAdminPermission = false;

            if (currentUser.IsAuthenticated)
            {
                // Temporarily raise permissions
                if (!currentUser.HasPermission(Permissions.SecurityAdministration))
                {
                    removeAdminPermission = true;
                    currentUser.AddPermissions(Permissions.SecurityAdministration);
                }

                roles = currentUser.Roles.ToList();

                // Don't forget to drop permission if necessary
                if (removeAdminPermission) currentUser.RemovePermissions(Permissions.SecurityAdministration);

            }

            return roles;
        }


        // Internal - Get a dictionary of permissions and whether use has those permissions
        // =========================================================================
        private List<string> getUserPermissions(ServerApplicationContext ctx)
        {
            var perms = new List<string>();

            var currentUser = ctx.Application.User;
            if (currentUser.IsAuthenticated)
            {
                var removeAdminPermission = false;

                // Temporarily raise permissions
                if (!currentUser.HasPermission(Permissions.SecurityAdministration))
                {
                    removeAdminPermission = true;
                    currentUser.AddPermissions(Permissions.SecurityAdministration);
                }

                perms = currentUser.EffectivePermissions
                    .Where(x => !removeAdminPermission || x.ToLower() != Permissions.SecurityAdministration.ToLower())
                    .Select(x => x.Split(':')[1])
                    .ToList();


                // Don't forget to drop permission if necessary
                if (removeAdminPermission) currentUser.RemovePermissions(Permissions.SecurityAdministration);

            }

            return perms;
        }

    }
}