/* globals Wsh: false */
/* globals __dirname: false */

/* globals describe: false */
/* globals test: false */
/* globals expect: false */

// Shorthand
var util = Wsh.Util;
var path = Wsh.Path;
var os = Wsh.OS;
var fs = Wsh.FileSystem;
var fse = Wsh.FileSystemExtra;
var zlib = Wsh.ZLIB;

var isSolidArray = util.isSolidArray;
var isBoolean = util.isBoolean;
var isSolidString = util.isSolidString;
var CMD = os.exefiles.cmd;
var NETSH_EXE = os.exefiles.netsh;

var _cb = function (fn/* , args */) {
  var args = Array.from(arguments).slice(1);
  return function () { fn.apply(null, args); };
};

describe('ZLIB', function () {
  var testName;

  var DEF_DIR_7ZIP = 'C:\\Program Files\\7-Zip';

  var dirAssets = path.join(__dirname, 'assets');
  var dir7zip = path.join(dirAssets, '7-Zip');
  var dirSandbox = path.join(dirAssets, 'Sandbox');
  var dirZipping = path.join(dirSandbox, 'ZippingDir');
  var dirHideen = path.join(dirZipping, '.HiddenDir');
  var dirEmpty = path.join(dirZipping, 'EmptyDir');
  var dirSub = path.join(dirZipping, 'SubDir');
  var fileBinary = path.join(dirZipping, '20000101T010101_Binary.ico');
  var fileTextSjis = path.join(dirZipping, '20000101T010102_Text-SJIS.txt');
  var fileTextUtf8 = path.join(dirZipping, '20000101T010103_Text-UTF8.txt');
  var files1 = [fileBinary, fileTextSjis];
  var dirDest = path.join(dirSandbox, 'DestDir');

  testName = 'deflateSync_dryRun_basic';
  test(testName, function () {
    var cmd;

    // Minimum
    cmd = zlib.deflateSync(dirZipping, null, {
      isDryRun: true
    });
    expect(cmd).toContain('"' + DEF_DIR_7ZIP + '\\7z.exe" u -tzip -ssw');
    expect(cmd).toContain(' -ssw "' + dirZipping + '.zip"'); // dest
    expect(cmd).toContain('.zip" "' + dirZipping + '"'); // src
    expect(cmd).not.toContain(' -mx');
    expect(cmd).not.toContain(' -p');
    expect(cmd).not.toContain(' -w');
    expect(cmd).not.toContain(' -xr!');

    // Adding dest
    cmd = zlib.deflateSync(dirZipping, dirDest, {
      isDryRun: true
    });
    expect(cmd).toContain('"' + DEF_DIR_7ZIP + '\\7z.exe" u -tzip -ssw');
    expect(cmd).toContain(' -ssw "' + dirDest + '\\' + path.basename(dirZipping) + '.zip"'); // dest
    expect(cmd).toContain('.zip" "' + dirZipping + '"'); // src
    expect(cmd).not.toContain(' -mx');
    expect(cmd).not.toContain(' -p');
    expect(cmd).not.toContain(' -w');
    expect(cmd).not.toContain(' -xr!');

    // Any source files
    cmd = zlib.deflateSync(files1, null, {
      isDryRun: true
    });
    expect(cmd).toContain('"' + DEF_DIR_7ZIP + '\\7z.exe" u -tzip -ssw');
    expect(cmd).toContain(' -ssw "' + path.dirname(files1[0]) + '\\' + path.basename(files1[0]) + '.zip"'); // dest
    expect(cmd).toContain(' "' + files1[0] + '"'); // src
    expect(cmd).toContain(' "' + files1[1] + '"'); // src
    expect(cmd).not.toContain(' -mx');
    expect(cmd).not.toContain(' -p');
    expect(cmd).not.toContain(' -w');
    expect(cmd).not.toContain(' -xr!');

    // Adding dest
    cmd = zlib.deflateSync(files1, dirDest, {
      isDryRun: true
    });
    expect(cmd).toContain('"' + DEF_DIR_7ZIP + '\\7z.exe" u -tzip -ssw');
    expect(cmd).toContain(' -ssw "' + dirDest + '\\' + path.basename(files1[0]) + '.zip"'); // dest
    expect(cmd).toContain(' "' + files1[0] + '"'); // src
    expect(cmd).toContain(' "' + files1[1] + '"'); // src
    expect(cmd).not.toContain(' -mx');
    expect(cmd).not.toContain(' -p');
    expect(cmd).not.toContain(' -w');
    expect(cmd).not.toContain(' -xr!');
  });

  testName = 'deflateSync_dryRun_options';
  test(testName, function () {
    var cmd;

    var dirCustom7Zip = 'D:\\My Custom Apps\\7-Zip';
    cmd = zlib.deflateSync(dirZipping, null, {
      dir7zip: dirCustom7Zip,
      isDryRun: true
    });
    expect(cmd).toContain('"' + dirCustom7Zip + '\\7z.exe" u -tzip -ssw');
    expect(cmd).toContain(' -ssw "' + dirZipping + '.zip"'); // dest
    expect(cmd).toContain('.zip" "' + dirZipping + '"'); // src
    expect(cmd).not.toContain(' -mx');
    expect(cmd).not.toContain(' -p');
    expect(cmd).not.toContain(' -w');
    expect(cmd).not.toContain(' -xr!');

    cmd = zlib.deflateSync(dirZipping, null, {
      dateCode: 'yyyyMMdd-HHmmss',
      isDryRun: true
    });
    expect(cmd).toContain('"' + DEF_DIR_7ZIP + '\\7z.exe" u -tzip -ssw');
    expect(cmd).toContain(' -ssw "' + dirZipping); // dest
    expect(cmd).toMatch(/_\d{8}-\d{6}\.zip/); // dest
    expect(cmd).toContain('.zip" "' + dirZipping + '"'); // src
    expect(cmd).not.toContain(' -mx');
    expect(cmd).not.toContain(' -p');
    expect(cmd).not.toContain(' -w');
    expect(cmd).not.toContain(' -xr!');

    cmd = zlib.deflateSync(dirZipping, null, {
      compressLv: 'Maximum',
      isDryRun: true
    });
    expect(cmd).toContain('"' + DEF_DIR_7ZIP + '\\7z.exe" u -tzip -ssw');
    expect(cmd).toContain(' -mx7 "' + dirZipping + '.zip"'); // dest
    expect(cmd).toContain('.zip" "' + dirZipping + '"'); // src
    expect(cmd).not.toContain(' -p');
    expect(cmd).not.toContain(' -w');
    expect(cmd).not.toContain(' -xr!');

    cmd = zlib.deflateSync(dirZipping, null, {
      compressLv: 'Fastest',
      isDryRun: true
    });
    expect(cmd).toContain(' -mx1 "' + dirZipping + '.zip"'); // dest

    cmd = zlib.deflateSync(dirZipping, null, {
      compressLv: 3,
      isDryRun: true
    });
    expect(cmd).toContain(' -mx3 "' + dirZipping + '.zip"'); // dest

    cmd = zlib.deflateSync(dirZipping, null, {
      password: 'This-is-mY&p@ss_^_<',
      isDryRun: true
    });
    expect(cmd).toContain('"' + DEF_DIR_7ZIP + '\\7z.exe" u -tzip -ssw');
    expect(cmd).toContain(' -mx7 "' + dirZipping + '.zip"'); // dest
    expect(cmd).toContain('.zip" "' + dirZipping + '"'); // src
    expect(cmd).not.toContain(' -p');
    expect(cmd).not.toContain(' -w');
    expect(cmd).not.toContain(' -xr!');
    console.log(cmd);
    console.log('');
    return;

    // cmd = zlib.deflateSync(dirZipping, dirDest, {
    //   excludePaths: dirSub,
    //   isDryRun: true
    // });
    // console.log(cmd);
    // console.log('');

  });

  /*
  testName = 'getAdaptersPropsSWbemObjs';
  test(testName, function () {
    var sWbemObjSets = net.getAdaptersPropsSWbemObjs();
    // console.dir(os.WMI.toJsObjects(sWbemObjSets));

    expect(isSolidArray(sWbemObjSets)).toBe(true);
    expect(isSolidString(sWbemObjSets[0].Caption)).toBe(true);
    expect(isSolidString(sWbemObjSets[0].GUID)).toBe(true);
    expect(isSolidString(sWbemObjSets[0].MACAddress)).toBe(true);
    expect(isSolidString(sWbemObjSets[0].Name)).toBe(true);
    // @TODO more test
  });

  testName = 'getAdaptersPropsObjs';
  test(testName, function () {
    var adapters = net.getAdaptersPropsObjs();
    // console.dir(adapters);

    expect(isSolidArray(adapters)).toBe(true);
    expect(isSolidString(adapters[0].Caption)).toBe(true);
    expect(isSolidString(adapters[0].GUID)).toBe(true);
    expect(isSolidString(adapters[0].MACAddress)).toBe(true);
    expect(isSolidString(adapters[0].Name)).toBe(true);
    // @TODO more test
  });

  testName = 'enablesDHCP';
  test(testName, function () {
    expect('@TODO').toBe('tested');

    var macAddress = '@TODO';
    var ipDHCP = net.enablesDHCP(macAddress);

    expect(isBoolean(ipDHCP)).toBe(true);
  });

  testName = 'getAdaptersConfsSWbemObjs';
  test(testName, function () {
    var sWbemObjSets = net.getAdaptersConfsSWbemObjs();
    // console.dir(os.WMI.toJsObjects(sWbemObjSets));

    expect(isSolidArray(sWbemObjSets)).toBe(true);
    expect(isSolidString(sWbemObjSets[0].Caption)).toBe(true);
    expect(isSolidString(sWbemObjSets[0].Description)).toBe(true);
    expect(isSolidString(sWbemObjSets[0].MACAddress)).toBe(true);
    expect(isSolidString(sWbemObjSets[0].SettingID)).toBe(true);
    // @TODO more test
  });

  testName = 'getAdaptersConfsObjs';
  test(testName, function () {
    var adapterConfs = net.getAdaptersConfsObjs();
    // console.dir(adapterConfs);

    expect(isSolidArray(adapterConfs)).toBe(true);
    expect(isSolidString(adapterConfs[0].Caption)).toBe(true);
    expect(isSolidString(adapterConfs[0].Description)).toBe(true);
    expect(isSolidString(adapterConfs[0].MACAddress)).toBe(true);
    expect(isSolidString(adapterConfs[0].SettingID)).toBe(true);
    // @TODO more test
  });

  testName = 'getIpSetInAdapters';
  test(testName, function () {
    expect('@TODO').toBe('tested');

    var ipAddresses = net.getIpSetInAdapters();
    console.dir(ipAddresses);

    expect(isSolidArray(ipAddresses)).toBe(true);
    expect(isSolidString(ipAddresses[0])).toBe(true); // xxx.xxx.xxx.xxx
  });

  testName = 'getDefaultGateways';
  test(testName, function () {
    expect('@TODO').toBe('tested');

    var ipAddresses = net.getDefaultGateways();
    console.dir(ipAddresses);

    expect(isSolidArray(ipAddresses)).toBe(true);
    expect(isSolidString(ipAddresses[0])).toBe(true); // "<IPv4>,<Ipv6>"
  });

  testName = 'getDnsIPsSetInAdapters';
  test(testName, function () {
    expect('@TODO').toBe('tested');

    var ipAddresses = net.getDnsIPsSetInAdapters();
    console.dir(ipAddresses);

    expect(isSolidArray(ipAddresses)).toBe(true);
    expect(isSolidString(ipAddresses[0])).toBe(true);
  });

  testName = 'exportWinFirewallSettings';
  test(testName, function () {
    noneStrVals.forEach(function (val) {
      expect(_cb(net.exportWinFirewallSettings, val)).toThrowError();
    });

    var fwPath = os.makeTmpPath('net_test_exportfwset', '.wfw');
    var retVal;

    // dry-run
    retVal = net.exportWinFirewallSettings(fwPath, { isDryRun: true });
    expect(retVal).toContain(CMD + ' /S /C"'
      + NETSH_EXE + ' advfirewall export ' + fwPath + ' 1> ');

    retVal = net.exportWinFirewallSettings(fwPath);
    expect(retVal.error).toBeFalsy();
    expect(retVal.stdout).toContain('OK');
    expect(fs.existsSync(fwPath)).toBe(true);

    // Cleans
    fse.removeSync(fwPath);
    expect(fs.existsSync(fwPath)).toBe(false);
  });

  // Update

  testName = 'setIpAddress';
  test(testName, function () {
    noneStrVals.forEach(function (val) {
      expect(_cb(net.setIpAddress, val)).toThrowError();
    });

    var netName = 'Ethernet 1';
    var ip = '11.22.33.44';
    var mask = '255.255.0.0';
    var defGw = '11.22.33.1';
    var retVal;

    // dry-run
    retVal = net.setIpAddress(netName, ip, mask, defGw, { isDryRun: true });
    expect(retVal).toContain('dry-run [_shRun]: ' + CMD + ' /S /C"'
      + NETSH_EXE + ' "interface ipv4" "set address"'
      + ' "name=\\"' + netName + '\\""'
      + ' "source=static address=' + ip + '" mask=' + mask
      + ' gateway=' + defGw + ' gwmetric=1 1> ');

    expect('@TODO').toBe('Testing on virtual adapter');
  });

  testName = 'setDnsServers';
  test(testName, function () {
    noneStrVals.forEach(function (val) {
      expect(_cb(net.setDnsServers, val)).toThrowError();
    });

    var retVal;
    var netName = 'Ethernet 1';

    // dry-run
    retVal = net.setDnsServers(netName, null, null, { isDryRun: true });
    expect(retVal).toContain('dry-run [_shRun]: ' + CMD + ' /S /C"'
      + NETSH_EXE + ' "interface ipv4" "set dnsservers"'
      + ' "name=\\"' + netName + '\\""'
      + ' source=dhcp 1> ');

    var dns1 = '11.22.33.1';

    // dry-run
    retVal = net.setDnsServers(netName, dns1, dns2, { isDryRun: true });
    expect(retVal).toContain('dry-run [_shRun]: ' + CMD + ' /S /C"'
      + NETSH_EXE + ' "interface ipv4" "set dnsservers"'
      + ' "name=\\"' + netName + '\\""'
      + ' source=static address=' + dns1 + ' register=non validate=no 1> ');

    var dns2 = '11.22.33.2';

    // dry-run
    retVal = net.setDnsServers(netName, dns1, dns2, { isDryRun: true });
    expect(retVal).toContain(CMD + ' /S /C"'
      + NETSH_EXE + ' "interface ipv4" "add dnsservers"'
      + ' "name=\\"' + netName + '\\""'
      + ' address=' + dns2 + ' index=2 validate=no 1> ');

    expect('@TODO').toBe('Testing on virtual adapter');
  });

  testName = 'setDnsServersWithWMI';
  test(testName, function () {
    expect('@TODO').toBe('Testing on virtual adapter');
  });

  testName = 'importWinFirewallSettings';
  test(testName, function () {
    noneStrVals.forEach(function (val) {
      expect(_cb(net.importWinFirewallSettings, val)).toThrowError();
    });

    var fwPath = os.makeTmpPath('net_test_exportfwset', '.wfw');

    expect(_cb(net.importWinFirewallSettings, fwPath)).toThrowError();

    fs.writeFileSync(fwPath, 'Dummy FireWall Values');

    var retVal;

    // dry-run
    retVal = net.importWinFirewallSettings(fwPath, { isDryRun: true });
    expect(retVal).toContain(CMD + ' /S /C"'
      + NETSH_EXE + ' advfirewall import ' + fwPath + ' 1> ');

    // Cleans
    fse.removeSync(fwPath);
    expect(fs.existsSync(fwPath)).toBe(false);

    expect('@TODO').toBe('Testing on virtual Window');
  });

  // Delete
  */
});
