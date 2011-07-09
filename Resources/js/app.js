var TFS = Titanium.Filesystem;

Titanium.AppCreator = {
	
	osx: function(runtime,destination,name,appid,install)
	{
		var src = TFS.getFile(destination,name+'.app');
		src.createDirectory(true);
		var contents = TFS.getFile(src,'Contents');
		contents.createDirectory(true);
		var resources = TFS.getFile(contents,'Resources');
		resources.createDirectory(true);
		var macos = TFS.getFile(contents,'MacOS');
		macos.createDirectory(true);
		var lproj = TFS.getFile(resources,'English.lproj');
		lproj.createDirectory(true);

		var templates = TFS.getFile(runtime,'template');
		var fromMacos = TFS.getFile(templates,'kboot');
		fromMacos.copy(macos);
		var boot = TFS.getFile(macos,'kboot');
		boot.rename(name);
		boot.setExecutable(true);

		var mainMenu = TFS.getFile(templates,'MainMenu.nib');
		mainMenu.copy(lproj);

		var icns = TFS.getFile(templates,'titanium.icns');
		icns.copy(lproj);

		var plist = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n"+
		"<!DOCTYPE plist PUBLIC \"-//Apple//DTD PLIST 1.0//EN\" \"http://www.apple.com/DTDs/PropertyList-1.0.dtd\">\n"+
		"<plist version=\"1.0\">\n"+
		"<dict>\n"+
		"	<key>CFBundleDevelopmentRegion</key>\n"+
		"	<string>English</string>\n"+
		"	<key>CFBundleExecutable</key>\n"+
		"	<string>"+name+"</string>\n"+
		"	<key>CFBundleIconFile</key>\n"+
		"	<string>titanium.icns</string>\n"+
		"	<key>CFBundleIdentifier</key>\n"+
		"	<string>"+appid+(install?'.installer':'')+"</string>\n"+
		"	<key>CFBundleInfoDictionaryVersion</key>\n"+
		"	<string>6.0</string>\n"+
		"	<key>CFBundleName</key>\n"+
		"	<string>"+name+"</string>\n"+
		"	<key>CFBundlePackageType</key>\n"+
		"	<string>APPL</string>\n"+
		" 	<key>CFBundleSignature</key>\n"+
		"  	<string>WRUN</string>\n"+
		"  	<key>CFBundleVersion</key>\n"+
		"  	<string>0.1</string>\n"+
		"	<key>NSMainNibFile</key>\n"+
		"	<string>MainMenu</string>\n"+
		"	<key>NSPrincipalClass</key>\n"+
		"	<string>NSApplication</string>\n"+
		"</dict>\n"+
		"</plist>\n";

		var infoplist = TFS.getFile(contents,'Info.plist');
		infoplist.write(plist);
		
		// set our marker file
		var marker = TFS.getFile(contents,'.installed');
		if (!install)
		{
			marker.write(String(new Date()));
		}
		else
		{
			marker.deleteFile();
		}

		return {
			resources:resources,
			base:contents,
			executable:src
		};
	},

	linux: function(runtime,destination,name,appid,install)
	{
		var appDir = TFS.getFile(destination,name);
		appDir.createDirectory(true);
		var resources = TFS.getFile(appDir,'Resources');
		resources.createDirectory(true);

		var templates = TFS.getFile(runtime,'template');
		var kboot = TFS.getFile(templates,'kboot');
		var appExecutable = TFS.getFile(appDir, name);
		kboot.copy(appExecutable);

		// set our marker file
		var marker = TFS.getFile(appDir,'.installed');
		if (!install)
		{
			marker.write(String(new Date()));
		}
		else
		{
			marker.deleteFile();
		}

		return {
			resources:resources,
			base:appDir,
			executable:appExecutable
		};
	},

	win32: function(runtime,destination,name,appid,install)
	{
		var appDir = TFS.getFile(destination,name);
		appDir.createDirectory(true);
		var resources = TFS.getFile(appDir,'Resources');
		resources.createDirectory(true);

		var templates = TFS.getFile(runtime,'template');
		var kboot = TFS.getFile(templates,'kboot.exe');
		var appExecutable = TFS.getFile(appDir, name + '.exe');
		kboot.copy(appExecutable);
		
		// in win32 because of COM manifest crap, we gotta put
		// the WebKit.dll and it's cohorts in the app folder
		var localRuntime = TFS.getFile(appDir,'runtime');
		localRuntime.createDirectory();
		var dlls = runtime.getDirectoryListing();
		for (var c=0;c<dlls.length;c++)
		{
			var dll = dlls[c];
			if (dll.extension()=="dll" || dll.name()=="manifest")
			{
				dll.copy(localRuntime);
			}
		}
		
		// also copy the inspector..
		var runtimeInspector = TFS.getFile(runtime, "inspector");
		var localInspector = TFS.getFile(localRuntime, "inspector");
		localInspector.createDirectory(true);
		var inspectorResources = runtimeInspector.getDirectoryListing();
		for (var r = 0; r < inspectorResources.length; r++) {
			var inspectorResource = inspectorResources[r];
			inspectorResource.copy(localInspector);
		}
		
		
		// set our marker file
		var marker = TFS.getFile(appDir,'.installed');
		if (!install)
		{
			marker.write(String(new Date()));
		}
		else
		{
			marker.deleteFile();
		}

		return {
			resources:resources,
			base:appDir,
			executable:appExecutable
		};
	}
};


Titanium.createApp = function(runtimeComponent,destination,name,appid,install)
{
	// Figure out where the asssets are. In older versions they were in
	// <runtime>/template, but in later versions they can be found in the
	// sdk directory.
	var assetsDir = TFS.getFile(runtimeComponent.getPath(), "template");
	if (!assetsDir.exists())
	{
		var components = Titanium.API.getApplication().getAvailableComponents();
		for (var i = 0; i < components.length; i++)
		{
			var c = components[i];
			if (c.getType() == Titanium.API.SDK &&
				c.getVersion() == runtimeComponent.getVersion())
			{
				assetsDir = TFS.getFile(components[i].getPath());
				break;
			}
		}
	}

	install = (typeof(install)=='undefined') ? true : install;
	var platform = Titanium.platform;
	var fn = Titanium.AppCreator[platform];
	return fn(runtime,destination,name,appid,install);
};
