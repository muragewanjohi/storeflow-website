$ErrorActionPreference = 'Stop'
Add-Type -TypeDefinition @'
using System;
using System.Collections;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Text;

public static class BleWatch {
  public static string Path;
  static readonly object Gate = new object();
  static MethodInfo toArray;

  static string Q(string value) {
    if (value == null) return "null";
    return "\"" + value.Replace("\\", "\\\\").Replace("\"", "\\\"") + "\"";
  }

  public static void OnPacket(object sender, object args) {
    try {
      if (toArray == null) {
        var ext = typeof(System.Runtime.InteropServices.WindowsRuntime.WindowsRuntimeBufferExtensions);
        toArray = ext.GetMethods(BindingFlags.Public | BindingFlags.Static)
          .First(m => m.Name == "ToArray" && m.GetParameters().Length == 1);
      }
      var ad = args.GetType().GetProperty("Advertisement").GetValue(args, null);
      var name = ad.GetType().GetProperty("LocalName").GetValue(ad, null) as string;
      var rssi = args.GetType().GetProperty("RawSignalStrengthInDBm").GetValue(args, null);
      var addr = args.GetType().GetProperty("BluetoothAddress").GetValue(args, null);
      var sections = ad.GetType().GetProperty("ManufacturerData").GetValue(ad, null) as IEnumerable;
      string ibeacon = "null";
      int company = -1;
      if (sections != null) {
        foreach (var section in sections) {
          company = Convert.ToInt32(section.GetType().GetProperty("CompanyId").GetValue(section, null));
          var data = section.GetType().GetProperty("Data").GetValue(section, null);
          var bytes = (byte[])toArray.Invoke(null, new object[] { data });
          if (company == 76 && bytes.Length >= 23 && bytes[0] == 0x02 && bytes[1] == 0x15) {
            var uuid = new StringBuilder();
            for (var i = 2; i < 18; i++) {
              if (i == 6 || i == 8 || i == 10 || i == 12) uuid.Append('-');
              uuid.Append(bytes[i].ToString("x2"));
            }
            int major = (bytes[18] << 8) | bytes[19];
            int minor = (bytes[20] << 8) | bytes[21];
            int tx = (sbyte)bytes[22];
            ibeacon = "{\"uuid\":" + Q(uuid.ToString()) + ",\"major\":" + major + ",\"minor\":" + minor + ",\"tx\":" + tx + "}";
          }
        }
      }
      var line = "{\"rssi\":" + rssi + ",\"addr\":" + Q(Convert.ToString(addr)) + ",\"name\":" + Q(name ?? "") + ",\"company\":" + company + ",\"ibeacon\":" + ibeacon + "}";
      lock (Gate) File.AppendAllText(Path, line + "\n");
    } catch (Exception ex) {
      lock (Gate) File.AppendAllText(Path, "{\"error\":" + Q(ex.GetBaseException().Message) + "}\n");
    }
  }
}
'@ -ReferencedAssemblies @('C:\Windows\Microsoft.NET\Framework64\v4.0.30319\System.Runtime.WindowsRuntime.dll')

$watcherType = [Windows.Devices.Bluetooth.Advertisement.BluetoothLEAdvertisementWatcher, Windows.Devices.Bluetooth, ContentType = WindowsRuntime]
$argsType = [Windows.Devices.Bluetooth.Advertisement.BluetoothLEAdvertisementReceivedEventArgs, Windows.Devices.Bluetooth, ContentType = WindowsRuntime]
$handlerType = [Windows.Foundation.TypedEventHandler`2, Windows.Foundation, ContentType = WindowsRuntime].MakeGenericType($watcherType, $argsType)
$sink = [BleWatch].GetMethod('OnPacket')
$dynamic = New-Object System.Reflection.Emit.DynamicMethod('OnBle', [void], ([type[]]@($watcherType, $argsType)), [BleWatch], $true)
$il = $dynamic.GetILGenerator()
$il.Emit([System.Reflection.Emit.OpCodes]::Ldarg_0)
$il.Emit([System.Reflection.Emit.OpCodes]::Ldarg_1)
$il.Emit([System.Reflection.Emit.OpCodes]::Call, $sink)
$il.Emit([System.Reflection.Emit.OpCodes]::Ret)
$script:delegate = $dynamic.CreateDelegate($handlerType)

$log = Join-Path $PSScriptRoot 'ble-watch.log'
Set-Content -Path $log -Value ''
[BleWatch]::Path = $log
$watcher = $watcherType::new()
$watcher.ScanningMode = [Windows.Devices.Bluetooth.Advertisement.BluetoothLEScanningMode]::Active
$script:token = $watcher.Add_Received($script:delegate)
$watcher.Start()
Write-Output ('{"status":"' + $watcher.Status + '"}')

while ($watcher.Status -eq 'Started' -or $watcher.Status -eq 'Aborted') {
  if ($watcher.Status -eq 'Aborted') {
    Write-Output '{"error":"Bluetooth scan stopped. Turn Bluetooth on and start this test again."}'
    break
  }
  Start-Sleep -Seconds 2
}
