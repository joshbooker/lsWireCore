/*
Post-Deployment Script Template							
--------------------------------------------------------------------------------------
 This file contains SQL statements that will be appended to the build script.		
 Use SQLCMD syntax to include a file in the post-deployment script.			
 Example:      :r .\myfile.sql								
 Use SQLCMD syntax to reference a variable in the post-deployment script.		
 Example:      :setvar TableName MyTable							
               SELECT * FROM [$(TableName)]					
--------------------------------------------------------------------------------------
*/

if ((select count(*) from [dbo].[tiles]) = 0)
	BEGIN
		SET IDENTITY_INSERT [dbo].[Tiles] ON
		INSERT INTO [dbo].[Tiles] ([Id], [MenuId], [TileId], [DisplayOrder], [BottomLeft], [BottomRight], [BackgroundColor], [TextColor], [Size], [Image], [Permission_Id], [CreatedBy], [Created], [ModifiedBy], [Modified]) VALUES (1, N'Home', N'Security', 1, N'Security', NULL, N'maroon', N'white', 2, null, N'Microsoft.LightSwitch.Security:SecurityAdministration', N'TestUser', N'4/4/2015 8:10:46 PM +00:00', N'TestUser', N'4/4/2015 8:12:53 PM +00:00')
		INSERT INTO [dbo].[Tiles] ([Id], [MenuId], [TileId], [DisplayOrder], [BottomLeft], [BottomRight], [BackgroundColor], [TextColor], [Size], [Image], [Permission_Id], [CreatedBy], [Created], [ModifiedBy], [Modified]) VALUES (2, N'Security', N'SecurityRoles', 1, N'Roles', NULL, N'maroon', N'white', 1, null, N'Microsoft.LightSwitch.Security:SecurityAdministration', N'TestUser', N'4/4/2015 8:14:05 PM +00:00', N'TestUser', N'4/4/2015 8:14:05 PM +00:00')
		INSERT INTO [dbo].[Tiles] ([Id], [MenuId], [TileId], [DisplayOrder], [BottomLeft], [BottomRight], [BackgroundColor], [TextColor], [Size], [Image], [Permission_Id], [CreatedBy], [Created], [ModifiedBy], [Modified]) VALUES (3, N'Security', N'SecurityUsers', 2, N'Users', NULL, N'maroon', N'white', 1, null, N'Microsoft.LightSwitch.Security:SecurityAdministration', N'TestUser', N'4/4/2015 8:15:15 PM +00:00', N'TestUser', N'4/4/2015 8:15:15 PM +00:00')
		SET IDENTITY_INSERT [dbo].[Tiles] OFF
	END