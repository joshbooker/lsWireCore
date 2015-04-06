using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;
using System.Web.Security;
using Microsoft.LightSwitch;
using Microsoft.LightSwitch.Security.Server;
namespace LightSwitchApplication
{
	public partial class formsSecurityDataService
	{

		partial void RolePermissions1_Validate(RolePermission entity, EntitySetValidationResultsBuilder results)
		{
			// Does this Role Permission already exists
			var exists = this.DataWorkspace.SecurityData.RolePermissions_SingleOrDefault(entity.RoleName, entity.PermissionId);
			if (exists != null) results.AddEntityError("The " + entity.Permission.Name + " permission has been added multiple times.");
		}

		partial void RoleAssignments_Validate(RoleAssignment entity, EntitySetValidationResultsBuilder results)
		{
			// Does this Role Assignment already exists
			var exists = this.DataWorkspace.SecurityData.RoleAssignments_SingleOrDefault(entity.UserName, entity.RoleName);
			if (exists != null) results.AddEntityError("The " + entity.RoleName + " role has been assigned multiple times.");
		}

		partial void UserRegistrations_Validate(UserRegistration entity, EntitySetValidationResultsBuilder results)
		{
			// UserName needs to be between 4 and 23 characters, underline/dot ok as long as not at the beginning/end
			var userNameRegEx = new Regex(@"^(?=[a-zA-Z])[-\w.]{4,23}([a-zA-Z\d]|(?<![-.])_)$");

			if (string.IsNullOrEmpty(entity.UserName) || !userNameRegEx.IsMatch(entity.UserName))
			{
				results.AddEntityError("Invalid UserName");
				return;
			}

			// If we are adding a new record and password is null/blank... error
			if (entity.Details.EntityState == Microsoft.LightSwitch.EntityState.Added && entity.Password == null)
			{
				results.AddEntityError("Invalid Password\n\nCan not be blank!");
				return;
			}

			// If Password is not null, period, validate it
			if (entity.Password != null)
			{
				var minLen = Membership.MinRequiredPasswordLength;
				var minSpecial = Membership.MinRequiredNonAlphanumericCharacters;
				var errorMessage = "";

				// At least one upper case character
				if (!entity.Password.Any(char.IsUpper))
					errorMessage += "Need at least one upper case character\n";

				// At least one lower case character
				if (!entity.Password.Any(char.IsLower))
					errorMessage += "Need at least one lower case character\n";

				// At least one digit
				if (!entity.Password.Any(char.IsDigit))
					errorMessage += "Need at least one digit (number)\n";

				// Needs to have at least the minimum amount of special characters
				if (SpecialCharacterCount(entity.Password) < minSpecial)
					errorMessage += "Need at least " + minSpecial + " special character(s)\n";

				// Finally, it needs to meet the minimum length requirement
				if (entity.Password.Length < minLen)
					errorMessage += "Need to have a minimum length of " + minLen + "\n";

				// If all conditions were not met, send error back
				if (!string.IsNullOrWhiteSpace(errorMessage))
				{
					results.AddEntityError("Invalid Password\n\n" + errorMessage);
					return;
				}
			}

			// If we are adding a new record, check to see if the username exists already
			if (entity.Details.EntityState == Microsoft.LightSwitch.EntityState.Added)
			{
				var exists = this.DataWorkspace.SecurityData.UserRegistrations_SingleOrDefault(entity.UserName);
				if (exists != null)
				{
					results.AddEntityError("UserName already exists");
					return;
				}
			}
		}


		private int SpecialCharacterCount(String pString)
		{
			return pString.Count(c => !char.IsLetterOrDigit(c));
		}


	}
}
