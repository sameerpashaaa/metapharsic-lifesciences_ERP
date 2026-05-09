$WshShell = New-Object -comObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut("c:\Users\Dell\Desktop\Start ERP.lnk")
$Shortcut.TargetPath = "c:\Users\Dell\Desktop\metapharsic-lifesciences (6)\start_app.bat"
$Shortcut.WorkingDirectory = "c:\Users\Dell\Desktop\metapharsic-lifesciences (6)"
$Shortcut.IconLocation = "shell32.dll, 137"
$Shortcut.Save()

$Shortcut2 = $WshShell.CreateShortcut("c:\Users\Dell\Desktop\Stop ERP.lnk")
$Shortcut2.TargetPath = "c:\Users\Dell\Desktop\metapharsic-lifesciences (6)\stop_app.bat"
$Shortcut2.WorkingDirectory = "c:\Users\Dell\Desktop\metapharsic-lifesciences (6)"
$Shortcut2.IconLocation = "shell32.dll, 27"
$Shortcut2.Save()
