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

var isEmpty = util.isEmpty;
var srrd = os.surroundCmdArg;

var _cb = function (fn/* , args */) {
  var args = Array.from(arguments).slice(1);
  return function () { fn.apply(null, args); };
};

describe('ZLIB', function () {
  var testName;

  var DEF_7Z_EXE = 'C:\\Program Files\\7-Zip\\7z.exe';
  var DEF_DIR_WINRAR = 'C:\\Program Files\\WinRAR';
  var EXENAME_WINRAR = 'WinRar.exe';
  var EXENAME_RAR = 'Rar.exe';

  var dirAssets = path.join(__dirname, 'assets');
  var dirBin = path.join(dirAssets, 'bin');
  var dir7zip = path.join(dirBin, '7-Zip');
  var exe7z = path.join(dir7zip, '7z.exe');
  var exe7zFM = path.join(dir7zip, '7zFM.exe');
  var dirWinRar = path.join(dirBin, 'WinRAR');

  var dirSandbox = path.join(dirAssets, 'Sandbox');
  var dirArchiving = path.join(dirSandbox, 'ZippingDir');
  var dirHideen = path.join(dirArchiving, '.HiddenDir');
  var dirEmpty = path.join(dirArchiving, 'EmptyDir');
  var dirSub = path.join(dirArchiving, 'SubDir');
  var fileBinary = path.join(dirArchiving, '20000101T010101_Binary.ico');
  var fileTextSjis = path.join(dirArchiving, '20000101T010102_Text-SJIS.txt');
  var fileTextUtf8 = path.join(dirArchiving, '20000101T010103_Text-UTF8.txt');
  var files1 = [fileBinary, fileTextSjis, fileTextUtf8];
  var dirDest = path.join(dirSandbox, 'DestDir');
  var dirDestDeflate = path.join(dirDest, 'deflate');
  var dirDestUnzip = path.join(dirDest, 'unzip');

  testName = '_makeDestArchivePath';
  test(testName, function () {
    var rtn;
    var destPath;

    // source: directory, dest: null
    destPath = dirArchiving + '.zip';
    rtn = zlib._makeDestArchivePath('.zip', dirArchiving);
    expect(rtn).toBe(destPath);

    // source: directory, dest: directory (existing)
    destPath = path.join(dirDestDeflate, path.basename(dirArchiving) + '.zip');
    rtn = zlib._makeDestArchivePath('.zip', dirArchiving, dirDestDeflate);
    expect(rtn).toBe(destPath);

    // source: directory, dest: Zip file path (Non existing)
    destPath = path.join(dirDestDeflate, 'My New Archive.zip');
    rtn = zlib._makeDestArchivePath('.zip', dirArchiving, destPath);
    expect(rtn).toBe(destPath);

    // source: any files, dest: null
    destPath = path.join(
      path.dirname(files1[0]),
      path.basename(files1[0]) + '.zip'
    );
    rtn = zlib._makeDestArchivePath('.zip', files1);
    expect(rtn).toBe(destPath);

    // source: any files, dest: directory (existing)
    destPath = path.join(dirDest, path.basename(files1[0]) + '.zip');
    rtn = zlib._makeDestArchivePath('.zip', files1, dirDest);
    expect(rtn).toBe(destPath);

    // source: any files, dest: Zip file path (Non existing)
    destPath = path.join(dirDest, 'My New Archive.zip');
    rtn = zlib._makeDestArchivePath('.zip', files1, destPath);
    expect(rtn).toBe(destPath);

    // source: wildcard (*) path, dest: null
    destPath = dirArchiving + '.zip';
    rtn = zlib._makeDestArchivePath('.zip', path.join(dirArchiving, '*'));
    expect(rtn).toBe(destPath);

    // source: wildcard path, dest: directory (existing)
    destPath = path.join(dirDest, 'xxx.zip');
    rtn = zlib._makeDestArchivePath('.zip', path.join(dirArchiving, '*'), dirDest);
    expect(rtn).toBe(destPath);

    // source: wildcard path, dest: Zip file path (Non existing)
    destPath = path.join(dirDest, 'My New Archive.zip');
    rtn = zlib._makeDestArchivePath('.zip', path.join(dirArchiving, '*'), destPath);
    expect(rtn).toBe(destPath);

    // source: wildcard (*.txt) path, dest: null
    destPath = path.join(dirArchiving, 'xxx.txt.zip');
    rtn = zlib._makeDestArchivePath('.zip', path.join(dirArchiving, '*.txt'));
    expect(rtn).toBe(destPath);

    // source: wildcard (*.txt) path, dest: directory (existing)
    destPath = path.join(dirDest, 'xxx.txt.zip');
    rtn = zlib._makeDestArchivePath('.zip', path.join(dirArchiving, '*.txt'), dirDest);
    expect(rtn).toBe(destPath);

    // source: wildcard (*.txt) path, dest: Zip file path (Non existing)
    destPath = path.join(dirDest, 'My New Archive.zip');
    rtn = zlib._makeDestArchivePath('.zip', path.join(dirArchiving, '*.txt'), destPath);
    expect(rtn).toBe(destPath);
  });

  // ZIP

  testName = 'deflateSync_dryRun';
  test(testName, function () {
    var cmd, destPath;

    // Minimum {{{
    cmd = zlib.deflateSync(dirArchiving, null, {
      isDryRun: true
    });
    destPath = dirArchiving + '.zip';
    expect(cmd).toContain('"' + DEF_7Z_EXE + '" u -tzip -ssw -r-');
    expect(cmd).toContain(' -r- "' + destPath + '"'); // dest
    expect(cmd).toContain('.zip" @"'); // src @TODO Check tmp list
    expect(cmd).not.toContain(' -mx');
    expect(cmd).not.toContain(' -p');
    expect(cmd).not.toContain(' -w');
    expect(cmd).not.toContain(' -xr!');
    // }}}

    // Adding dest {{{
    cmd = zlib.deflateSync(dirArchiving, dirDestDeflate, {
      isDryRun: true
    });
    destPath = path.join(dirDestDeflate, path.basename(dirArchiving) + '.zip');
    expect(cmd).toContain('"' + DEF_7Z_EXE + '" u -tzip -ssw -r-');
    expect(cmd).toContain(' -r- "' + destPath + '"'); // dest
    expect(cmd).toContain('.zip" @"'); // src @TODO Check tmp list
    expect(cmd).not.toContain(' -mx');
    expect(cmd).not.toContain(' -p');
    expect(cmd).not.toContain(' -w');
    expect(cmd).not.toContain(' -xr!');
    // }}}

    // Any source files {{{
    cmd = zlib.deflateSync(files1, null, {
      isDryRun: true
    });
    destPath = path.join(
      path.dirname(files1[0]),
      path.basename(files1[0]) + '.zip'
    );
    expect(cmd).toContain('"' + DEF_7Z_EXE + '" u -tzip -ssw -r-');
    expect(cmd).toContain(' -r- "' + destPath + '"'); // dest
    expect(cmd).toContain('.zip" @"'); // src @TODO Check tmp list
    // expect(cmd).toContain(' "' + files1[0] + '"'); // src
    // expect(cmd).toContain(' "' + files1[1] + '"'); // src
    expect(cmd).not.toContain(' -mx');
    expect(cmd).not.toContain(' -p');
    expect(cmd).not.toContain(' -w');
    expect(cmd).not.toContain(' -xr!');
    // }}}

    // Adding dest {{{
    cmd = zlib.deflateSync(files1, dirDestDeflate, {
      isDryRun: true
    });
    destPath = path.join(dirDestDeflate, path.basename(files1[0]) + '.zip');
    expect(cmd).toContain('"' + DEF_7Z_EXE + '" u -tzip -ssw -r-');
    expect(cmd).toContain(' -r- "' + destPath + '"'); // dest
    expect(cmd).toContain('.zip" @"'); // src @TODO Check tmp list
    // expect(cmd).toContain(' "' + files1[0] + '"'); // src
    // expect(cmd).toContain(' "' + files1[1] + '"'); // src
    expect(cmd).not.toContain(' -mx');
    expect(cmd).not.toContain(' -p');
    expect(cmd).not.toContain(' -w');
    expect(cmd).not.toContain(' -xr!');
    // }}}
  });

  testName = 'deflateSync_options_dryRun';
  test(testName, function () {
    var cmd, destPath;

    // Custom 7-Zip {{{
    var exe7zCustomPath = 'D:\\My Custom Apps\\7-Zip\\7z.exe';
    cmd = zlib.deflateSync(dirArchiving, null, {
      exe7z: exe7zCustomPath,
      isDryRun: true
    });
    destPath = dirArchiving + '.zip';
    expect(cmd).toContain('"' + exe7zCustomPath + '" u -tzip -ssw -r-');
    expect(cmd).toContain(' -r- "' + destPath + '"'); // dest
    expect(cmd).toContain('.zip" @"'); // src @TODO Check tmp list
    expect(cmd).not.toContain(' -mx');
    expect(cmd).not.toContain(' -p');
    expect(cmd).not.toContain(' -w');
    expect(cmd).not.toContain(' -xr!');
    // }}}

    // DateCode Option {{{
    cmd = zlib.deflateSync(dirArchiving, null, {
      dateCode: 'yyyyMMdd-HHmmss',
      isDryRun: true
    });
    destPath = dirArchiving + '.zip';
    expect(cmd).toContain('"' + DEF_7Z_EXE + '" u -tzip -ssw -r-');
    expect(cmd).toContain(' -r- "' + dirArchiving); // dest
    expect(cmd).toMatch(/_\d{8}-\d{6}\.zip/); // dest
    expect(cmd).toContain('.zip" @"'); // src @TODO Check tmp list
    expect(cmd).not.toContain(' -mx');
    expect(cmd).not.toContain(' -p');
    expect(cmd).not.toContain(' -w');
    expect(cmd).not.toContain(' -xr!');
    // }}}

    // Compression Level {{{
    cmd = zlib.deflateSync(dirArchiving, null, {
      compressLv: 'Maximum',
      isDryRun: true
    });
    expect(cmd).toContain('"' + DEF_7Z_EXE + '" u -tzip -ssw -r-');
    expect(cmd).toContain(' "' + dirArchiving + '.zip"'); // dest
    expect(cmd).toContain('.zip" @"'); // src @TODO Check tmp list
    expect(cmd).toContain(' -mx7');
    expect(cmd).not.toContain(' -p');
    expect(cmd).not.toContain(' -w');
    expect(cmd).not.toContain(' -xr!');

    cmd = zlib.deflateSync(dirArchiving, null, {
      compressLv: 'Fastest',
      isDryRun: true
    });
    expect(cmd).toContain(' -mx1 "' + dirArchiving + '.zip"'); // dest

    cmd = zlib.deflateSync(dirArchiving, null, {
      compressLv: 3,
      isDryRun: true
    });
    expect(cmd).toContain(' -mx3 "' + dirArchiving + '.zip"'); // dest
    // }}}

    // Password Option {{{
    var password = 'This is mY&p@ss ^_<';
    cmd = zlib.deflateSync(dirArchiving, null, {
      password: password,
      isDryRun: true
    });
    expect(cmd).toContain('"' + DEF_7Z_EXE + '" u -tzip -ssw -r-');
    expect(cmd).toContain(' "' + dirArchiving + '.zip"'); // dest
    expect(cmd).toContain('.zip" @"'); // src @TODO Check tmp list
    expect(cmd).not.toContain(' -mx');
    expect(cmd).toContain(' -p"' + password + '" -mem=AES256 "');
    expect(cmd).not.toContain(' -w');
    expect(cmd).not.toContain(' -xr!');
    // }}}

    // Working Directory Option {{{
    var tmpDir = 'R:\\RAMdisk\\tmp';
    cmd = zlib.deflateSync(dirArchiving, null, {
      workingDir: tmpDir,
      isDryRun: true
    });
    expect(cmd).toContain('"' + DEF_7Z_EXE + '" u -tzip -ssw ');
    expect(cmd).toContain(' -w"' + tmpDir + '"');
    expect(cmd).toContain(' "' + dirArchiving + '.zip"'); // dest
    expect(cmd).toContain('.zip" @"'); // src @TODO Check tmp list
    expect(cmd).not.toContain(' -mx');
    expect(cmd).not.toContain(' -p');
    expect(cmd).not.toContain(' -xr!');
    // }}}

    // Exclude Option {{{
    var baseNames = files1.map(function (p) {
      return path.basename(p);
    });

    cmd = zlib.deflateSync(dirArchiving, null, {
      excludingFiles: baseNames,
      isDryRun: true
    });
    expect(cmd).toContain('"' + DEF_7Z_EXE + '" u -tzip -ssw -r-');
    expect(cmd).toContain(' "' + dirArchiving + '.zip"'); // dest
    expect(cmd).toContain('.zip" @"'); // src @TODO Check tmp list
    expect(cmd).not.toContain(' -mx');
    expect(cmd).not.toContain(' -p');
    expect(cmd).not.toContain(' -w');
    expect(cmd).toContain(' -x@"'); // src @TODO Check tmp list
    // expect(cmd).toContain(' -xr!"' + baseNames[0] + '"');
    // expect(cmd).toContain(' -xr!"' + baseNames[1] + '"');

    cmd = zlib.deflateSync(dirArchiving, null, {
      excludingFiles: baseNames,
      includesSubDir: true,
      isDryRun: true
    });
    expect(cmd).toContain(' -xr@"'); // src @TODO Check tmp list
    // }}}
  });

  testName = 'deflateSync_toThrowError';
  test(testName, function () {
    var dirNonExisting = 'B:\\My Data Folder\\deflated';
    expect(_cb(zlib.deflateSync, dirNonExisting, null, {
      exe7z: exe7z
    })).toThrowError();
  });

  testName = 'deflateSync_directory_src';
  test(testName, function () {
    var destPath, rtn;

    // source: directory -> dest: null
    destPath = dirArchiving + '.zip';
    fse.removeSync(destPath);
    expect(fs.existsSync(destPath)).toBe(false);

    rtn = zlib.deflateSync(dirArchiving, null, { exe7z: exe7z });
    expect(rtn.error).toBe(false);
    expect(isEmpty(rtn.stderr)).toBe(true);
    expect(rtn.archivedPath).toBe(destPath);
    expect(fs.existsSync(rtn.archivedPath)).toBe(true);

    fse.removeSync(destPath); // Clean

    // source: directory -> dest: directory (existing)
    destPath = path.join(dirDestDeflate, path.basename(dirArchiving) + '.zip');
    fse.removeSync(destPath);
    expect(fs.existsSync(destPath)).toBe(false);

    rtn = zlib.deflateSync(dirArchiving, dirDestDeflate, { exe7z: exe7z });
    expect(rtn.error).toBe(false);
    expect(isEmpty(rtn.stderr)).toBe(true);
    expect(rtn.archivedPath).toBe(destPath);
    expect(fs.existsSync(rtn.archivedPath)).toBe(true);

    fse.removeSync(destPath); // Clean

    // source: directory -> dest: Zip file path (Non existing)
    destPath = path.join(dirDestDeflate, 'My New Archive.zip');
    fse.removeSync(destPath);
    expect(fs.existsSync(destPath)).toBe(false);

    rtn = zlib.deflateSync(dirArchiving, destPath, { exe7z: exe7z });
    expect(rtn.error).toBe(false);
    expect(isEmpty(rtn.stderr)).toBe(true);
    expect(rtn.archivedPath).toBe(destPath);
    expect(fs.existsSync(rtn.archivedPath)).toBe(true);

    fse.removeSync(destPath); // Clean
  });

  testName = 'deflateSync_files_src';
  test(testName, function () {
    var destPath, rtn;

    // source: any files -> dest: null
    destPath = path.join(
      path.dirname(files1[0]),
      path.basename(files1[0]) + '.zip'
    );
    fse.removeSync(destPath);
    expect(fs.existsSync(destPath)).toBe(false);

    rtn = zlib.deflateSync(files1, null, { exe7z: exe7z });
    expect(rtn.error).toBe(false);
    expect(isEmpty(rtn.stderr)).toBe(true);
    expect(rtn.archivedPath).toBe(destPath);
    expect(fs.existsSync(rtn.archivedPath)).toBe(true);

    fse.removeSync(destPath); // Clean

    // source: any files -> dest: directory (existing)
    destPath = path.join(dirDest, path.basename(files1[0]) + '.zip');
    fse.removeSync(destPath);
    expect(fs.existsSync(destPath)).toBe(false);

    rtn = zlib.deflateSync(files1, dirDest, { exe7z: exe7z });
    expect(rtn.error).toBe(false);
    expect(isEmpty(rtn.stderr)).toBe(true);
    expect(rtn.archivedPath).toBe(destPath);
    expect(fs.existsSync(rtn.archivedPath)).toBe(true);

    fse.removeSync(destPath); // Clean

    // source: any files -> dest: Zip file path (Non existing)
    destPath = path.join(dirDest, 'My New Archive.zip');
    fse.removeSync(destPath);
    expect(fs.existsSync(destPath)).toBe(false);

    rtn = zlib.deflateSync(files1, destPath, { exe7z: exe7z });
    expect(rtn.error).toBe(false);
    expect(isEmpty(rtn.stderr)).toBe(true);
    expect(rtn.archivedPath).toBe(destPath);
    expect(fs.existsSync(rtn.archivedPath)).toBe(true);

    fse.removeSync(destPath); // Clean
  });

  testName = 'deflateSync_src_withWildcard';
  test(testName, function () {
    var destPath, rtn;

    // source: wildcard (*) path -> dest: null
    destPath = dirArchiving + '.zip';
    fse.removeSync(destPath);
    expect(fs.existsSync(destPath)).toBe(false);

    // @NOTE The top folder (ZippingDir) will not be included in the Zip archive.
    // When specifying '\\*', All files and sub directories will be compressed.
    rtn = zlib.deflateSync(path.join(dirArchiving, '*'), null, {
      exe7z: exe7z
    });
    expect(rtn.error).toBe(false);
    expect(isEmpty(rtn.stderr)).toBe(true);
    expect(rtn.archivedPath).toBe(destPath);
    expect(fs.existsSync(rtn.archivedPath)).toBe(true);

    fse.removeSync(destPath); // Clean

    // source: wildcard path -> dest: directory (existing)
    destPath = path.join(dirDest, 'xxx.zip');
    fse.removeSync(destPath);
    expect(fs.existsSync(destPath)).toBe(false);

    rtn = zlib.deflateSync(path.join(dirArchiving, '*'), dirDest, {
      exe7z: exe7z
    });
    expect(rtn.error).toBe(false);
    expect(isEmpty(rtn.stderr)).toBe(true);
    expect(rtn.archivedPath).toBe(destPath);
    expect(fs.existsSync(rtn.archivedPath)).toBe(true);

    fse.removeSync(destPath); // Clean

    // source: wildcard path -> dest: Zip file path (Non existing)
    destPath = path.join(dirDest, 'My New Archive.zip');
    fse.removeSync(destPath);
    expect(fs.existsSync(destPath)).toBe(false);

    rtn = zlib.deflateSync(path.join(dirArchiving, '*'), destPath, {
      exe7z: exe7z
    });
    expect(rtn.error).toBe(false);
    expect(isEmpty(rtn.stderr)).toBe(true);
    expect(rtn.archivedPath).toBe(destPath);
    expect(fs.existsSync(rtn.archivedPath)).toBe(true);

    fse.removeSync(destPath); // Clean

    // source: wildcard (*.txt) path -> dest: null
    destPath = path.join(dirArchiving, 'xxx.txt.zip');
    fse.removeSync(destPath);
    expect(fs.existsSync(destPath)).toBe(false);

    // @NOTE The top folder (ZippingDir) will not be included in the Zip archive.
    // When specifying '\\*.txt', All .txt files in only the root directory will be compressed.
    rtn = zlib.deflateSync(path.join(dirArchiving, '*.txt'), null, {
      exe7z: exe7z
    });
    expect(rtn.error).toBe(false);
    expect(isEmpty(rtn.stderr)).toBe(true);
    expect(rtn.archivedPath).toBe(destPath);
    expect(fs.existsSync(rtn.archivedPath)).toBe(true);

    fse.removeSync(destPath); // Clean

    // source: wildcard (*.txt) path -> dest: directory (existing)
    destPath = path.join(dirDest, 'xxx.txt.zip');
    fse.removeSync(destPath);
    expect(fs.existsSync(destPath)).toBe(false);

    rtn = zlib.deflateSync(path.join(dirArchiving, '*.txt'), dirDest, {
      includesSubDir: true,
      exe7z: exe7z
    });
    expect(rtn.error).toBe(false);
    expect(isEmpty(rtn.stderr)).toBe(true);
    expect(rtn.archivedPath).toBe(destPath);
    expect(fs.existsSync(rtn.archivedPath)).toBe(true);

    fse.removeSync(destPath); // Clean

    // source: wildcard (*.txt) path -> dest: Zip file path (Non existing)
    destPath = path.join(dirDest, 'My New Archive.zip');
    fse.removeSync(destPath);
    expect(fs.existsSync(destPath)).toBe(false);

    rtn = zlib.deflateSync(path.join(dirArchiving, '*.txt'), destPath, {
      exe7z: exe7z
    });
    expect(rtn.error).toBe(false);
    expect(isEmpty(rtn.stderr)).toBe(true);
    expect(rtn.archivedPath).toBe(destPath);
    expect(fs.existsSync(rtn.archivedPath)).toBe(true);

    fse.removeSync(destPath); // Clean
  });

  testName = 'deflateSync_dest_nonExtension';
  test(testName, function () {
    var destPath, rtn;

    // source: any files, dest: Name + Non extension
    destPath = path.join(dirDest, 'My New Archive');
    fse.removeSync(destPath + '.zip');
    expect(fs.existsSync(destPath + '.zip')).toBe(false);

    rtn = zlib.deflateSync(files1, destPath, { exe7z: exe7z });
    expect(rtn.error).toBe(false);
    expect(isEmpty(rtn.stderr)).toBe(true);
    expect(rtn.archivedPath).toBe(destPath + '.zip');
    expect(fs.existsSync(rtn.archivedPath)).toBe(true);

    fse.removeSync(destPath); // Clean
  });

  testName = 'deflateSync_custom7z';
  test(testName, function () {
    // Custom 7-Zip
    var exe7zNonExisting = 'R:\\My Custom Apps\\7-Zip\\7z.exe';

    expect(_cb(zlib.deflateSync, dirArchiving, null, {
      exe7z: exe7zNonExisting
    })).toThrowError();
  });

  testName = 'deflateSync_dateCode';
  test(testName, function () {
    var rtn;

    rtn = zlib.deflateSync(dirArchiving, dirDestDeflate, {
      exe7z: exe7z,
      dateCode: 'yyyyMMdd-HHmmss'
    });
    expect(rtn.error).toBe(false);

    var matches = rtn.stdout.match(/Creating archive: (.+\.zip)/i);
    expect(matches).toHaveLength(2);

    var createdZipPath = matches[1].trim();
    expect(createdZipPath).toMatch(/_\d{8}-\d{6}\.zip$/); // dest
    expect(rtn.archivedPath).toBe(createdZipPath);
    expect(fs.existsSync(createdZipPath)).toBe(true);

    fse.removeSync(createdZipPath); // Clean
  });

  testName = 'deflateSync_compressLv';
  test(testName, function () {
    var destPath, rtn;

    destPath = path.join(dirDestDeflate, path.basename(dirArchiving) + '.zip');
    fse.removeSync(destPath);
    expect(fs.existsSync(destPath)).toBe(false);

    rtn = zlib.deflateSync(dirArchiving, dirDestDeflate, {
      compressLv: 9,
      exe7z: exe7z
    });
    expect(rtn.error).toBe(false);
    expect(isEmpty(rtn.stderr)).toBe(true);
    expect(rtn.archivedPath).toBe(destPath);
    expect(fs.existsSync(destPath)).toBe(true);

    fse.removeSync(destPath); // Clean

    expect('@TODO').toBe('Test to compare each file size');
  });

  testName = 'deflateSync_password';
  test(testName, function () {
    var destPath, rtn;
    destPath = path.join(dirDest, path.basename(dirArchiving) + '.zip');
    fse.removeSync(destPath);
    expect(fs.existsSync(destPath)).toBe(false);

    var password = 'This is mY&p@ss ^_<';
    rtn = zlib.deflateSync(dirArchiving, dirDest, {
      password: password,
      exe7z: exe7z
    });
    expect(rtn.error).toBe(false);
    expect(isEmpty(rtn.stderr)).toBe(true);
    expect(rtn.archivedPath).toBe(destPath);
    expect(fs.existsSync(destPath)).toBe(true);

    fse.removeSync(destPath); // Clean

    expect('@TODO').toBe('Test to confirm decrypting the Zip file by the password.');
  });

  testName = 'deflateSync_excludingFiles';
  test(testName, function () {
    var rtn;
    var destPath;

    // Exclude Option
    destPath = path.join(dirDestDeflate, path.basename(dirArchiving) + '.zip');
    fse.removeSync(destPath);
    expect(fs.existsSync(destPath)).toBe(false);

    var baseNames = files1.map(function (p) {
      return path.basename(p);
    });

    // @NOTE Since `includesSubDir` option is not specified, all files are compressed. The exclusive list is useless.
    rtn = zlib.deflateSync(dirArchiving, dirDestDeflate, {
      excludingFiles: baseNames,
      exe7z: exe7z
    });
    expect(rtn.error).toBe(false);
    expect(isEmpty(rtn.stderr)).toBe(true);
    expect(rtn.archivedPath).toBe(destPath);
    expect(fs.existsSync(destPath)).toBe(true);

    // @TODO Confirm the content in the file.

    fse.removeSync(destPath); // Clean

    // Specify `includesSubDir: true`
    rtn = zlib.deflateSync(dirArchiving, dirDestDeflate, {
      excludingFiles: baseNames,
      includesSubDir: true,
      exe7z: exe7z
    });
    expect(rtn.error).toBe(false);
    expect(isEmpty(rtn.stderr)).toBe(true);
    expect(rtn.archivedPath).toBe(destPath);
    expect(fs.existsSync(destPath)).toBe(true);

    // @TODO Confirm the content in the file.

    fse.removeSync(destPath); // Clean

    // Specify `includesSubDir: true`
    rtn = zlib.deflateSync(dirArchiving, dirDestDeflate, {
      excludingFiles: ['*SJIS*'],
      includesSubDir: true,
      exe7z: exe7z
    });
    expect(rtn.error).toBe(false);
    expect(isEmpty(rtn.stderr)).toBe(true);
    expect(rtn.archivedPath).toBe(destPath);
    expect(fs.existsSync(destPath)).toBe(true);

    // @TODO Confirm the content in the file.

    fse.removeSync(destPath); // Clean

    expect('@TODO').toBe('Test to confirm the archived files in the Zip');
  });

  testName = 'deflateSync_updateMode';
  test(testName, function () {
    var rtn;
    var destPath;

    // Create a source Zip file
    destPath = path.join(dirDestDeflate, 'My New Archive.zip');
    fse.removeSync(destPath);
    expect(fs.existsSync(destPath)).toBe(false);

    rtn = zlib.deflateSync(path.join(dirArchiving, '*SJIS*'), destPath, {
      exe7z: exe7z
    });
    expect(rtn.error).toBe(false);
    expect(isEmpty(rtn.stderr)).toBe(true);
    expect(rtn.archivedPath).toBe(destPath);
    expect(fs.existsSync(destPath)).toBe(true);

    console.popup('Check the Zip: ' + destPath);
    // @TODO Confirm the content in the file.

    // updateMode: sync (default)
    rtn = zlib.deflateSync(path.join(dirArchiving, '*UTF8*'), destPath, {
      exe7z: exe7z
    });
    expect(rtn.error).toBe(false);
    expect(isEmpty(rtn.stderr)).toBe(true);
    expect(rtn.archivedPath).toBe(destPath);
    expect(fs.existsSync(destPath)).toBe(true);

    console.popup('Check the Zip: ' + destPath);
    // @TODO Confirm the content in the file.

    // updateMode: add
    rtn = zlib.deflateSync(path.join(dirArchiving, '*.ico'), destPath, {
      updateMode: 'add',
      exe7z: exe7z
    });
    expect(rtn.error).toBe(false);
    expect(isEmpty(rtn.stderr)).toBe(true);
    expect(rtn.archivedPath).toBe(destPath);
    expect(fs.existsSync(destPath)).toBe(true);

    console.popup('Check the Zip: ' + destPath);
    // @TODO Confirm the content in the file.

    // updateMode: add
    rtn = zlib.deflateSync(path.join(dirArchiving, '*.ico'), destPath, {
      updateMode: 'add',
      includesSubDir: true,
      exe7z: exe7z
    });
    expect(rtn.error).toBe(false);
    expect(isEmpty(rtn.stderr)).toBe(true);
    expect(rtn.archivedPath).toBe(destPath);
    expect(fs.existsSync(destPath)).toBe(true);

    console.popup('Check the Zip: ' + destPath);
    // @TODO Confirm the content in the file.

    fse.removeSync(destPath); // Clean

    expect('@TODO').toBe('Test to automaticaly confirm the archived files in the Zip');
  });

  testName = 'deflateSync_many_options';
  test(testName, function () {
    var rtn;
    var destPath;
    var password = 'This is mY&p@ss ^_<';

    rtn = zlib.deflateSync(path.join(dirArchiving, '*.txt'), dirDestDeflate, {
        dateCode: 'yyyyMMdd-HHmmss',
        compressLv: 9,
        password: password,
        excludingFiles: ['*SJIS*'],
        includesSubDir: true,
        exe7z: exe7z
      }
    );
    expect(rtn.error).toBe(false);
    expect(isEmpty(rtn.stderr)).toBe(true);
    expect(fs.existsSync(rtn.archivedPath)).toBe(true);

    console.popup('Check the Zip: ' + rtn.archivedPath);
    // @TODO Confirm the content in the file.

    fse.removeSync(destPath); // Clean

    expect('@TODO').toBe('Test to automaticaly confirm the archived files in the Zip');
  });

  testName = 'openZip';
  test(testName, function () {
    var zipPath;

    // Create the opening Zip
    zipPath = path.join(dirDestDeflate, 'My New Archive for openZip.zip');
    fse.removeSync(zipPath);
    expect(fs.existsSync(zipPath)).toBe(false);

    zlib.deflateSync(dirArchiving, zipPath, { exe7z: exe7z });
    expect(fs.existsSync(zipPath)).toBe(true);

    // Opening
    var exe7zFmNonExisting = 'R:\\My Custom Apps\\7-Zip\\7zFM.exe';
    expect(_cb(zlib.openZip, zipPath, { exe7zFM: exe7zFmNonExisting })).toThrowError();

    zlib.openZip(zipPath, { exe7zFM: exe7zFM });

    console.popup('Finished to confirm the Zip file?');
    fse.removeSync(zipPath); // Clean
  });

  testName = 'unzipSync_makesZipNameDir_dryRun';
  test(testName, function () {
    var zipName = 'My New Archive for openZip';
    var zipPath = path.join(dirDestDeflate, zipName + '.zip');
    var cmd;

    // No makesZipDir option (false)
    cmd = zlib.unzipSync(zipPath, null, {
      isDryRun: true
    });
    expect(cmd).toContain('"' + DEF_7Z_EXE + '" x ');
    expect(cmd).toContain(' x "' + zipPath + '"');
    expect(cmd).toContain(' -o"' + dirDestDeflate + '"');

    // makesArchiveNameDir: false
    cmd = zlib.unzipSync(zipPath, null, {
      makesArchiveNameDir: false,
      isDryRun: true
    });
    expect(cmd).toContain('"' + DEF_7Z_EXE + '" x ');
    expect(cmd).toContain(' x "' + zipPath + '"');
    expect(cmd).toContain(' -o"' + dirDestDeflate + '"');

    // makesArchiveNameDir: true
    cmd = zlib.unzipSync(zipPath, null, {
      makesArchiveNameDir: true,
      isDryRun: true
    });
    expect(cmd).toContain('"' + DEF_7Z_EXE + '" x ');
    expect(cmd).toContain(' x "' + zipPath + '"');
    expect(cmd).toContain(' -o"' + path.join(dirDestDeflate, zipName) + '"');

    // Specify dest directory
    cmd = zlib.unzipSync(zipPath, dirDestUnzip, {
      isDryRun: true
    });
    expect(cmd).toContain('"' + DEF_7Z_EXE + '" x ');
    expect(cmd).toContain(' x "' + zipPath + '"');
    expect(cmd).toContain(' -o"' + dirDestUnzip + '"');

    // makesArchiveNameDir: false
    cmd = zlib.unzipSync(zipPath, dirDestUnzip, {
      makesArchiveNameDir: false,
      isDryRun: true
    });
    expect(cmd).toContain('"' + DEF_7Z_EXE + '" x ');
    expect(cmd).toContain(' x "' + zipPath + '"');
    expect(cmd).toContain(' -o"' + dirDestUnzip + '"');

    // makesArchiveNameDir: true
    cmd = zlib.unzipSync(zipPath, dirDestUnzip, {
      makesArchiveNameDir: true,
      isDryRun: true
    });
    expect(cmd).toContain('"' + DEF_7Z_EXE + '" x ');
    expect(cmd).toContain(' x "' + zipPath + '"');
    expect(cmd).toContain(' -o"' + path.join(dirDestUnzip, zipName) + '"');
  });

  testName = 'unzipSync_makesZipNameDir';
  test(testName, function () {
    var zipName = 'My New Archive for unzip';
    var zipPath = path.join(dirDestDeflate, zipName + '.zip');
    var destPath;
    var rtn;

    // Delete a unzipping archive, If existing
    fse.removeSync(zipPath);
    expect(fs.existsSync(zipPath)).toBe(false);

    // Create the unzipping archive
    zlib.deflateSync(dirArchiving, zipPath, { exe7z: exe7z });
    expect(fs.existsSync(zipPath)).toBe(true);

    // Execute with non existing 7z.exe -> Error
    var exe7zNonExisting = 'R:\\My Custom Apps\\7-Zip\\7z.exe';
    expect(
      _cb( zlib.unzipSync, zipPath, dirDest, {
        exe7z: exe7zNonExisting
      })
    ).toThrowError();

    // No makesZipDir option (false)
    destPath = path.join(dirDestDeflate, path.basename(dirArchiving));
    expect(fs.existsSync(destPath)).toBe(false);

    rtn = zlib.unzipSync(zipPath, null, {
      exe7z: exe7z
    });
    expect(fs.existsSync(destPath)).toBe(true);
    // Clean
    fse.removeSync(destPath);
    expect(fs.existsSync(destPath)).toBe(false);

    // makesArchiveNameDir: false
    destPath = path.join(dirDestDeflate, path.basename(dirArchiving));
    expect(fs.existsSync(destPath)).toBe(false);

    rtn = zlib.unzipSync(zipPath, null, {
      makesArchiveNameDir: false,
      exe7z: exe7z
    });
    expect(fs.existsSync(destPath)).toBe(true);
    // Clean
    fse.removeSync(destPath);
    expect(fs.existsSync(destPath)).toBe(false);

    // makesArchiveNameDir: true -> the Zip file name folder will be created
    destPath = path.join(dirDestDeflate, zipName);
    rtn = zlib.unzipSync(zipPath, null, {
      makesArchiveNameDir: true,
      exe7z: exe7z
    });
    expect(fs.existsSync(destPath)).toBe(true);
    // Clean
    fse.removeSync(destPath);
    expect(fs.existsSync(destPath)).toBe(false);

    // Specify a dest directory
    // No makesZipDir option (false)
    destPath = path.join(dirDestUnzip, path.basename(dirArchiving));
    rtn = zlib.unzipSync(zipPath, dirDestUnzip, {
      exe7z: exe7z
    });
    expect(fs.existsSync(destPath)).toBe(true);
    // Clean
    fse.removeSync(destPath);
    expect(fs.existsSync(destPath)).toBe(false);

    // makesArchiveNameDir: false
    destPath = path.join(dirDestUnzip, path.basename(dirArchiving));
    rtn = zlib.unzipSync(zipPath, dirDestUnzip, {
      makesArchiveNameDir: false,
      exe7z: exe7z
    });
    expect(fs.existsSync(destPath)).toBe(true);
    // Clean
    fse.removeSync(destPath);
    expect(fs.existsSync(destPath)).toBe(false);

    // makesArchiveNameDir: true
    destPath = path.join(dirDestUnzip, zipName);
    rtn = zlib.unzipSync(zipPath, dirDestUnzip, {
      makesArchiveNameDir: true,
      exe7z: exe7z
    });
    expect(fs.existsSync(destPath)).toBe(true);
    // Clean
    fse.removeSync(destPath);
    expect(fs.existsSync(destPath)).toBe(false);

    fse.removeSync(zipPath);
    expect(fs.existsSync(zipPath)).toBe(false);
  });

  // RAR

  testName = 'deflateSyncIntoRar_dryRun';
  test(testName, function () {
    var cmd, destPath;

    // Minimum {{{
    cmd = zlib.deflateSyncIntoRar(dirArchiving, null, {
      isDryRun: true
    });
    destPath = dirArchiving + '.rar';
    expect(cmd).toContain(
      '"' + path.join(DEF_DIR_WINRAR, EXENAME_RAR) + '" a '
    );
    expect(cmd).toContain(' a -u '); // -u: Update files
    expect(cmd).toContain(' -o+ '); // -o+: Overwrite existing
    expect(cmd).toContain(' -r0 '); // Recurse subdirectories
    expect(cmd).toContain(' -dh '); // Open shared files
    expect(cmd).toContain(' -ep1 '); // Exclude base directory from names
    expect(cmd).toContain(' -m3 '); // Compression level (0..5)
    expect(cmd).toContain(' -ma5 '); // A version of archiving format
    expect(cmd).toContain(' -os '); // Save NTFS streams
    expect(cmd).toContain(' -s '); // Create solid archive
    expect(cmd).toContain(' -y '); // Assume Yes on all queries
    expect(cmd).toContain(' -y "' + destPath + '"'); // dest
    expect(cmd).toContain('.rar" @"'); // source list
    // }}}

    // Adding dest {{{
    cmd = zlib.deflateSyncIntoRar(dirArchiving, dirDestDeflate, {
      isDryRun: true
    });
    destPath = path.join(dirDestDeflate, path.basename(dirArchiving) + '.rar');
    expect(cmd).toContain(
      '"' + path.join(DEF_DIR_WINRAR, EXENAME_RAR) + '" a '
    );
    expect(cmd).toContain(' a -u '); // -u: Update files
    expect(cmd).toContain(' -o+ '); // -o+: Overwrite existing
    expect(cmd).toContain(' -r0 '); // Recurse subdirectories
    expect(cmd).toContain(' -dh '); // Open shared files
    expect(cmd).toContain(' -ep1 '); // Exclude base directory from names
    expect(cmd).toContain(' -m3 '); // Compression level (0..5)
    expect(cmd).toContain(' -ma5 '); // A version of archiving format
    expect(cmd).toContain(' -os '); // Save NTFS streams
    expect(cmd).toContain(' -s '); // Create solid archive
    expect(cmd).toContain(' -y '); // Assume Yes on all queries
    expect(cmd).toContain(' -y "' + destPath + '"'); // dest
    expect(cmd).toContain('.rar" @"'); // source list
    // }}}

    // Any source files & isGUI {{{
    cmd = zlib.deflateSyncIntoRar(files1, null, {
      isGUI: true,
      isDryRun: true
    });
    destPath = path.join(
      path.dirname(files1[0]),
      path.basename(files1[0]) + '.rar'
    );
    expect(cmd).toContain(
      '"' + path.join(DEF_DIR_WINRAR, EXENAME_WINRAR) + '" a '
    );
    expect(cmd).toContain(' a -u '); // -u: Update files
    expect(cmd).toContain(' -o+ '); // -o+: Overwrite existing
    expect(cmd).toContain(' -r0 '); // Recurse subdirectories
    expect(cmd).toContain(' -dh '); // Open shared files
    expect(cmd).toContain(' -ep1 '); // Exclude base directory from names
    expect(cmd).toContain(' -m3 '); // Compression level (0..5)
    expect(cmd).toContain(' -ma5 '); // A version of archiving format
    expect(cmd).toContain(' -os '); // Save NTFS streams
    expect(cmd).toContain(' -s '); // Create solid archive
    expect(cmd).toContain(' -y '); // Assume Yes on all queries
    expect(cmd).toContain(' -y "' + destPath + '"'); // dest
    expect(cmd).toContain('.rar" @"'); // source list
    // }}}

    // Adding dest {{{
    cmd = zlib.deflateSyncIntoRar(files1, dirDestDeflate, {
      isGUI: true,
      isDryRun: true
    });
    destPath = path.join(dirDestDeflate, path.basename(files1[0]) + '.rar');
    expect(cmd).toContain(
      '"' + path.join(DEF_DIR_WINRAR, EXENAME_WINRAR) + '" a '
    );
    expect(cmd).toContain(' a -u '); // -u: Update files
    expect(cmd).toContain(' -o+ '); // -o+: Overwrite existing
    expect(cmd).toContain(' -r0 '); // Recurse subdirectories
    expect(cmd).toContain(' -dh '); // Open shared files
    expect(cmd).toContain(' -ep1 '); // Exclude base directory from names
    expect(cmd).toContain(' -m3 '); // Compression level (0..5)
    expect(cmd).toContain(' -ma5 '); // A version of archiving format
    expect(cmd).toContain(' -os '); // Save NTFS streams
    expect(cmd).toContain(' -s '); // Create solid archive
    expect(cmd).toContain(' -y '); // Assume Yes on all queries
    expect(cmd).toContain(' -y "' + destPath + '"'); // dest
    expect(cmd).toContain('.rar" @"'); // source list
    // }}}
  });

  testName = 'deflateSyncIntoRar_customRar_dryRun';
  test(testName, function () {
    var cmd, destPath;

    var dirWinRarCustomPath = 'D:\\My Apps\\WinRAR';
    cmd = zlib.deflateSyncIntoRar(dirArchiving, null, {
      dirWinRar: dirWinRarCustomPath,
      isDryRun: true
    });
    destPath = dirArchiving;
    expect(cmd).toContain(
      '"' + path.join(dirWinRarCustomPath, EXENAME_RAR) + '" a '
    );
    expect(cmd).toContain(' a -u '); // -u: Update files
    expect(cmd).toContain(' -o+ '); // -o+: Overwrite existing
    expect(cmd).toContain(' -r0 '); // Recurse subdirectories
    expect(cmd).toContain(' -dh '); // Open shared files
    expect(cmd).toContain(' -ep1 '); // Exclude base directory from names
    expect(cmd).toContain(' -m3 '); // Compression level (0..5)
    expect(cmd).toContain(' -ma5 '); // A version of archiving format
    expect(cmd).toContain(' -os '); // Save NTFS streams
    expect(cmd).toContain(' -s '); // Create solid archive
    expect(cmd).toContain(' -y '); // Assume Yes on all queries
    expect(cmd).toContain(' -y "' + destPath + '.rar"'); // dest
    expect(cmd).toContain('.rar" @"'); // source list
  });

  testName = 'deflateSyncIntoRar_dateCode_dryRun';
  test(testName, function () {
    var cmd, destPath;

    var dirWinRarCustomPath = 'D:\\My Apps\\WinRAR';
    cmd = zlib.deflateSyncIntoRar(dirArchiving, null, {
      dirWinRar: dirWinRarCustomPath,
      dateCode: 'yyyyMMdd-HHmmss',
      isGUI: true,
      isDryRun: true
    });
    expect(cmd).toContain(
      '"' + path.join(dirWinRarCustomPath, EXENAME_WINRAR) + '" a '
    );
    destPath = dirArchiving;
    expect(cmd).toContain(' -y "' + destPath); // dest
    expect(cmd).toMatch(/_\d{8}-\d{6}\.rar/); // dest
    expect(cmd).toContain('.rar" @"'); // src @TODO Check tmp list
  });

  testName = 'deflateSyncIntoRar_compression_dryRun';
  test(testName, function () {
    var cmd, destPath;

    // Compression Level, Recovery record, CPU priority
    cmd = zlib.deflateSyncIntoRar(dirArchiving, null, {
      compressLv: 0,
      isDryRun: true
    });
    expect(cmd).toContain(
      '"' + path.join(DEF_DIR_WINRAR, EXENAME_RAR) + '" a '
    );
    expect(cmd).toContain(' -m0'); // Compression level
    expect(cmd).not.toContain(' -m3');

    cmd = zlib.deflateSyncIntoRar(dirArchiving, null, {
      compressLv: 5,
      recoveryPer: 3,
      isDryRun: true
    });
    expect(cmd).toContain(' -m5'); // Compression level
    expect(cmd).not.toContain(' -m3');
    expect(cmd).toContain(' -rr3p'); // Recovery record

    cmd = zlib.deflateSyncIntoRar(dirArchiving, null, {
      compressLv: 3,
      cpuPriority: 10,
      isDryRun: true
    });
    expect(cmd).toContain(' -m3');
  });

  testName = 'deflateSyncIntoRar_password_dryRun';
  test(testName, function () {
    var cmd, destPath;

    var password = 'This is mY&p@ss ^_<';
    cmd = zlib.deflateSyncIntoRar(dirArchiving, null, {
      password: password,
      isDryRun: true
    });
    expect(cmd).toContain(
      '"' + path.join(DEF_DIR_WINRAR, EXENAME_RAR) + '" a '
    );
    expect(cmd).toContain(' a -u '); // -u: Update files
    expect(cmd).toContain(' -o+ '); // -o+: Overwrite existing
    expect(cmd).toContain(' -r0 '); // Recurse subdirectories
    expect(cmd).toContain(' -dh '); // Open shared files
    expect(cmd).toContain(' -ep1 '); // Exclude base directory from names
    expect(cmd).toContain(' -m3 '); // Compression level (0..5)
    expect(cmd).toContain(' -ma5 '); // A version of archiving format
    expect(cmd).toContain(' -os '); // Save NTFS streams
    expect(cmd).toContain(' -s '); // Create solid archive
    expect(cmd).toContain(' -y '); // Assume Yes on all queries
    expect(cmd).toContain('.rar" @"'); // source list
    expect(cmd).toContain(' -hp"' + password + '"');
  });

  testName = 'deflateSyncIntoRar_workingDir_dryRun';
  test(testName, function () {
    var cmd, destPath;

    // Working Directory, ADS
    var tmpDir = 'R:\\RAMdisk\\tmp';
    cmd = zlib.deflateSyncIntoRar(dirArchiving, null, {
      workingDir: tmpDir,
      excludesADS: true,
      isGUI: true,
      isDryRun: true
    });
    expect(cmd).toContain(
      '"' + path.join(DEF_DIR_WINRAR, EXENAME_WINRAR) + '" a '
    );
    expect(cmd).toContain(' -w"' + tmpDir + '"'); // Working Directory
    expect(cmd).not.toContain(' -os '); // Does not save NTFS streams
  });

  testName = 'deflateSyncIntoRar_exclude_dryRun';
  test(testName, function () {
    var cmd, destPath;

    // Exclude, Recurses SubDir
    var baseNames = files1.map(function (p) {
      return path.basename(p);
    });

    cmd = zlib.deflateSyncIntoRar(dirArchiving, null, {
      excludingFiles: baseNames,
      excludesUsingFiles: true,
      excludesEmptyDir: true,
      isDryRun: true
    });
    expect(cmd).toContain(
      '"' + path.join(DEF_DIR_WINRAR, EXENAME_RAR) + '" a '
    );
    expect(cmd).toContain(' -x@"'); // @TODO Confirm the content in the file.
    expect(cmd).not.toContain(' -dh '); // Excludes shared files
    expect(cmd).toContain(' -ed '); // Does not add empty directories

    cmd = zlib.deflateSyncIntoRar(path.join(dirArchiving, '*.txt'), null, {
      excludesSubDirWildcard: true,
      isDryRun: true
    });
    expect(cmd).not.toContain(' -r0 ');
  });

  testName = 'deflateSyncIntoRar_toThrowError';
  test(testName, function () {
    var dirNonExisting = 'B:\\My Data Folder\\deflated';
    expect(_cb(zlib.deflateSyncIntoRar, dirNonExisting, null, {
      dirWinRar: dirWinRar
    })).toThrowError();
  });

  testName = 'deflateSyncIntoRar_directory_src';
  test(testName, function () {
    var destPath, rtn;

    // source: directory -> dest: null
    destPath = dirArchiving + '.rar';
    fse.removeSync(destPath);
    expect(fs.existsSync(destPath)).toBe(false);

    rtn = zlib.deflateSyncIntoRar(dirArchiving, null, {
      dirWinRar: dirWinRar
    });
    expect(rtn.error).toBe(false);
    expect(isEmpty(rtn.stderr)).toBe(true);
    expect(rtn.archivedPath).toBe(destPath);
    expect(fs.existsSync(rtn.archivedPath)).toBe(true);

    fse.removeSync(destPath); // Clean

    // source: directory -> dest: directory (existing)
    destPath = path.join(dirDestDeflate, path.basename(dirArchiving) + '.rar');
    fse.removeSync(destPath);
    expect(fs.existsSync(destPath)).toBe(false);

    rtn = zlib.deflateSyncIntoRar(dirArchiving, dirDestDeflate, {
      dirWinRar: dirWinRar
    });
    expect(rtn.error).toBe(false);
    expect(isEmpty(rtn.stderr)).toBe(true);
    expect(rtn.archivedPath).toBe(destPath);
    expect(fs.existsSync(rtn.archivedPath)).toBe(true);

    fse.removeSync(destPath); // Clean

    // source: directory -> dest: rar file path (Non existing)
    destPath = path.join(dirDestDeflate, 'My New Archive.rar');
    fse.removeSync(destPath);
    expect(fs.existsSync(destPath)).toBe(false);

    rtn = zlib.deflateSyncIntoRar(dirArchiving, destPath, {
      dirWinRar: dirWinRar
    });
    expect(rtn.error).toBe(false);
    expect(isEmpty(rtn.stderr)).toBe(true);
    expect(rtn.archivedPath).toBe(destPath);
    expect(fs.existsSync(rtn.archivedPath)).toBe(true);

    fse.removeSync(destPath); // Clean
  });

  testName = 'deflateSyncIntoRar_files_src';
  test(testName, function () {
    var destPath, rtn;

    // source: any files -> dest: null
    destPath = path.join(
      path.dirname(files1[0]),
      path.basename(files1[0]) + '.rar'
    );
    fse.removeSync(destPath);
    expect(fs.existsSync(destPath)).toBe(false);

    rtn = zlib.deflateSyncIntoRar(files1, null, {
      dirWinRar: dirWinRar
    });
    expect(rtn.error).toBe(false);
    expect(isEmpty(rtn.stderr)).toBe(true);
    expect(rtn.archivedPath).toBe(destPath);
    expect(fs.existsSync(destPath)).toBe(true);

    fse.removeSync(destPath); // Clean

    // source: any files, dest: directory (existing)
    destPath = path.join(dirDest, path.basename(files1[0]) + '.rar');
    fse.removeSync(destPath);
    expect(fs.existsSync(destPath)).toBe(false);

    rtn = zlib.deflateSyncIntoRar(files1, dirDest, { dirWinRar: dirWinRar });
    expect(rtn.error).toBe(false);
    expect(isEmpty(rtn.stderr)).toBe(true);
    expect(rtn.archivedPath).toBe(destPath);
    expect(fs.existsSync(destPath)).toBe(true);

    fse.removeSync(destPath); // Clean

    // source: any files, dest: rar file path (Non existing)
    destPath = path.join(dirDest, 'My New Archive.rar');
    fse.removeSync(destPath);
    expect(fs.existsSync(destPath)).toBe(false);

    rtn = zlib.deflateSyncIntoRar(files1, destPath, {
      dirWinRar: dirWinRar
    });
    expect(rtn.error).toBe(false);
    expect(isEmpty(rtn.stderr)).toBe(true);
    expect(rtn.archivedPath).toBe(destPath);
    expect(fs.existsSync(destPath)).toBe(true);

    fse.removeSync(destPath); // Clean
  });

  testName = 'deflateSyncIntoRar_src_withWildcard';
  test(testName, function () {
    var destPath, rtn;

    // source: wildcard (*) path -> dest: null
    destPath = dirArchiving + '.rar';
    fse.removeSync(destPath);
    expect(fs.existsSync(destPath)).toBe(false);

    // @NOTE The top folder (rarpingDir) will not be included in the rar archive.
    // When specifying '\\*', All files and sub directories will be compressed.
    rtn = zlib.deflateSyncIntoRar(path.join(dirArchiving, '*'), null, {
      dirWinRar: dirWinRar
    });
    expect(rtn.error).toBe(false);
    expect(isEmpty(rtn.stderr)).toBe(true);
    expect(rtn.archivedPath).toBe(destPath);
    expect(fs.existsSync(destPath)).toBe(true);

    fse.removeSync(destPath); // Clean

    // source: wildcard path -> dest: directory (existing)
    destPath = path.join(dirDest, 'xxx.rar');
    fse.removeSync(destPath);
    expect(fs.existsSync(destPath)).toBe(false);

    rtn = zlib.deflateSyncIntoRar(path.join(dirArchiving, '*'), dirDest, {
      dirWinRar: dirWinRar
    });
    expect(rtn.error).toBe(false);
    expect(isEmpty(rtn.stderr)).toBe(true);
    expect(rtn.archivedPath).toBe(destPath);
    expect(fs.existsSync(destPath)).toBe(true);

    fse.removeSync(destPath); // Clean

    // source: wildcard path -> dest: rar file path (Non existing)
    destPath = path.join(dirDest, 'My New Archive.rar');
    fse.removeSync(destPath);
    expect(fs.existsSync(destPath)).toBe(false);

    rtn = zlib.deflateSyncIntoRar(path.join(dirArchiving, '*'), destPath, {
      dirWinRar: dirWinRar
    });
    expect(rtn.error).toBe(false);
    expect(isEmpty(rtn.stderr)).toBe(true);
    expect(rtn.archivedPath).toBe(destPath);
    expect(fs.existsSync(destPath)).toBe(true);

    fse.removeSync(destPath); // Clean

    // source: wildcard (*.txt) path -> dest: null
    destPath = path.join(dirArchiving, 'xxx.txt.rar');
    fse.removeSync(destPath);
    expect(fs.existsSync(destPath)).toBe(false);

    // @NOTE The top folder (rarpingDir) will not be included in the rar archive.
    // When specifying '\\*.txt', All .txt files in only the root directory will be compressed.
    rtn = zlib.deflateSyncIntoRar(path.join(dirArchiving, '*.txt'), null, {
      dirWinRar: dirWinRar
    });
    expect(rtn.error).toBe(false);
    expect(isEmpty(rtn.stderr)).toBe(true);
    expect(rtn.archivedPath).toBe(destPath);
    expect(fs.existsSync(destPath)).toBe(true);

    fse.removeSync(destPath); // Clean

    // source: wildcard (*.txt) path -> dest: directory (existing)
    destPath = path.join(dirDest, 'xxx.txt.rar');
    fse.removeSync(destPath);
    expect(fs.existsSync(destPath)).toBe(false);

    rtn = zlib.deflateSyncIntoRar(path.join(dirArchiving, '*.txt'), dirDest, {
      includesSubDir: true,
      dirWinRar: dirWinRar
    });
    expect(rtn.error).toBe(false);
    expect(isEmpty(rtn.stderr)).toBe(true);
    expect(rtn.archivedPath).toBe(destPath);
    expect(fs.existsSync(destPath)).toBe(true);

    fse.removeSync(destPath); // Clean

    // source: wildcard (*.txt) path -> dest: rar file path (Non existing)
    destPath = path.join(dirDest, 'My New Archive.rar');
    fse.removeSync(destPath);
    expect(fs.existsSync(destPath)).toBe(false);

    rtn = zlib.deflateSyncIntoRar(path.join(dirArchiving, '*.txt'), destPath, {
      dirWinRar: dirWinRar
    });
    expect(rtn.error).toBe(false);
    expect(isEmpty(rtn.stderr)).toBe(true);
    expect(rtn.archivedPath).toBe(destPath);
    expect(fs.existsSync(destPath)).toBe(true);

    fse.removeSync(destPath); // Clean
    // }}}
  });

  testName = 'deflateSyncIntoRar_dest_nonExtension';
  test(testName, function () {
    var destPath, rtn;

    // source: any files, dest: Name + Non extension
    destPath = path.join(dirDest, 'My New Archive');
    fse.removeSync(destPath + '.rar');
    expect(fs.existsSync(destPath + '.rar')).toBe(false);

    rtn = zlib.deflateSyncIntoRar(files1, destPath, {
      dirWinRar: dirWinRar
    });
    expect(rtn.error).toBe(false);
    expect(isEmpty(rtn.stderr)).toBe(true);
    expect(rtn.archivedPath).toBe(destPath + '.rar');
    expect(fs.existsSync(rtn.archivedPath)).toBe(true);

    fse.removeSync(destPath); // Clean
  });

  testName = 'deflateSyncIntoRar_customRar';
  test(testName, function () {
    var dirWinRarNonExisting = 'R:\\My Custom Apps\\Win Rar';
    expect(_cb(zlib.deflateSyncIntoRar, dirArchiving, null, {
      dirWinRar: dirWinRarNonExisting
    })).toThrowError();
  });

  testName = 'deflateSyncIntoRar_isGUI';
  test(testName, function () {
    var rtn;

    rtn = zlib.deflateSyncIntoRar(dirArchiving, dirDestDeflate, {
      dirWinRar: dirWinRar,
      isGUI: true
    });
    expect(rtn.exitCode).toBe(0);
    expect(rtn.error).toBe(false);
    expect(rtn.stdout).toBe('');
    expect(rtn.stderr).toBe('');
    expect(fs.existsSync(rtn.archivedPath)).toBe(true);

    fse.removeSync(rtn.archivedPath); // Clean
  });

  testName = 'deflateSyncIntoRar_dateCode';
  test(testName, function () {
    var rtn;

    rtn = zlib.deflateSyncIntoRar(dirArchiving, dirDestDeflate, {
      dirWinRar: dirWinRar,
      dateCode: 'yyyyMMdd-HHmmss'
    });
    expect(rtn.error).toBe(false);
    expect(rtn.archivedPath).toMatch(/_\d{8}-\d{6}\.rar$/);
    expect(fs.existsSync(rtn.archivedPath)).toBe(true);

    fse.removeSync(rtn.archivedPath); // Clean
  });

  testName = 'deflateSyncIntoRar_compressLv';
  test(testName, function () {
    var destPath, rtn;

    destPath = path.join(dirDestDeflate, path.basename(dirArchiving) + '.rar');
    fse.removeSync(destPath);
    expect(fs.existsSync(destPath)).toBe(false);

    rtn = zlib.deflateSyncIntoRar(dirArchiving, dirDestDeflate, {
      compressLv: 0,
      dirWinRar: dirWinRar
    });
    expect(rtn.error).toBe(false);
    expect(isEmpty(rtn.stderr)).toBe(true);
    expect(rtn.archivedPath).toBe(destPath);
    expect(fs.existsSync(rtn.archivedPath)).toBe(true);

    // @TODO compare each file size

    fse.removeSync(destPath); // Clean

    expect('@TODO').toBe('Test to confirm compression Lv');
  });

  testName = 'deflateSyncIntoRar_password';
  test(testName, function () {
    var destPath, rtn;
    destPath = path.join(dirDest, path.basename(dirArchiving) + '.rar');
    fse.removeSync(destPath);
    expect(fs.existsSync(destPath)).toBe(false);

    var password = 'This is mY&p@ss ^_<';
    rtn = zlib.deflateSyncIntoRar(dirArchiving, dirDest, {
      password: password,
      dirWinRar: dirWinRar
    });
    expect(rtn.error).toBe(false);
    expect(isEmpty(rtn.stderr)).toBe(true);
    expect(rtn.archivedPath).toBe(destPath);
    expect(fs.existsSync(rtn.archivedPath)).toBe(true);

    // @TODO decrypt the Rar file by the password.

    fse.removeSync(destPath); // Clean

    expect('@TODO').toBe('Confirm to decrypt the Rar file by the password');
  });

  testName = 'deflateSyncIntoRar_excludingFiles';
  test(testName, function () {
    var rtn;
    var destPath;

    destPath = path.join(dirDestDeflate, path.basename(dirArchiving) + '.rar');
    fse.removeSync(destPath);
    expect(fs.existsSync(destPath)).toBe(false);

    var baseNames = [
      fileBinary, // Full path
      'settings.json',
      '*utf16*',
      '*\\20000101T010103_Text-UTF8.txt'
    ];

    rtn = zlib.deflateSyncIntoRar(dirArchiving, dirDestDeflate, {
      excludingFiles: baseNames,
      dirWinRar: dirWinRar
    });
    expect(rtn.error).toBe(false);
    expect(isEmpty(rtn.stderr)).toBe(true);
    expect(rtn.archivedPath).toBe(destPath);
    expect(fs.existsSync(rtn.archivedPath)).toBe(true);

    // @TODO Confirm the content in the list file.

    // @TODO Confirm the content in the file.

    fse.removeSync(destPath); // Clean

    // excludesEmptyDir
    rtn = zlib.deflateSyncIntoRar(dirArchiving, dirDestDeflate, {
      excludingFiles: baseNames,
      excludesEmptyDir: true,
      dirWinRar: dirWinRar
    });
    expect(rtn.error).toBe(false);
    expect(isEmpty(rtn.stderr)).toBe(true);
    expect(fs.existsSync(destPath)).toBe(true);

    // @TODO Confirm the content in the file.

    fse.removeSync(destPath); // Clean

    // excludesSubDirWildcard
    rtn = zlib.deflateSyncIntoRar(dirArchiving, dirDestDeflate, {
      excludingFiles: baseNames,
      excludesSubDirWildcard: true,
      dirWinRar: dirWinRar
    });
    expect(rtn.error).toBe(false);
    expect(isEmpty(rtn.stderr)).toBe(true);
    expect(fs.existsSync(destPath)).toBe(true);

    // @TODO Confirm the content in the file.

    fse.removeSync(destPath); // Clean

    expect('@TODO').toBe('Confirm the content in the file');
  });

  testName = 'deflateSyncIntoRar_many_options';
  test(testName, function () {
    var rtn;
    var destPath;

    destPath = path.join(dirDestDeflate, path.basename(dirArchiving) + '.rar');
    fse.removeSync(destPath);
    expect(fs.existsSync(destPath)).toBe(false);

    var baseNames = [
      fileBinary, // Full path
      'settings.json',
      '*utf16*',
      '*\\20000101T010103_Text-UTF8.txt'
    ];

    rtn = zlib.deflateSyncIntoRar(dirArchiving, dirDestDeflate, {
      dateCode: 'yyyyMMdd-HHmmss',
      compressLv: 0,
      password: 'This is mY&p@ss ^_<',
      excludingFiles: baseNames,
      excludesEmptyDir: true,
      excludesSubDirWildcard: true,
      isGUI: true,
      dirWinRar: dirWinRar
    });
    expect(rtn.error).toBe(false);
    expect(isEmpty(rtn.stderr)).toBe(true);
    expect(fs.existsSync(rtn.archivedPath)).toBe(true);

    // @TODO Confirm the content in the file.

    fse.removeSync(destPath); // Clean

    expect('@TODO').toBe('Confirm the content in the file');
  });

  testName = 'testRarSync';
  test(testName, function () {
    var rarPath, rtn;

    // Creating the testing Rar
    rarPath = path.join(dirDestDeflate, 'My New Archive for openRar.rar');
    fse.removeSync(rarPath);
    expect(fs.existsSync(rarPath)).toBe(false);

    zlib.deflateSyncIntoRar(dirArchiving, rarPath, { dirWinRar: dirWinRar });
    expect(fs.existsSync(rarPath)).toBe(true);

    // Testing
    // Specifying non existing WinRar directory
    var dirWinRarNonExisting = 'R:\\My Custom Apps\\WinRar';
    expect(_cb(zlib.testRarSync, rarPath, { dirWinRar: dirWinRarNonExisting })).toThrowError();

    // Not a Rar file: exitCode = 10
    expect(_cb(zlib.testRarSync, fileBinary, { dirWinRar: dirWinRar })).toThrowError();

    // Basic
    rtn = zlib.testRarSync(rarPath, { dirWinRar: dirWinRar });
    expect(rtn.exitCode).toBe(0);
    expect(rtn.error).toBe(false);
    expect(rtn.stdout).toContain('All OK');
    expect(rtn.stderr).toBe('');

    // isGUI
    rtn = zlib.testRarSync(rarPath, {
      isGUI: true,
      dirWinRar: dirWinRar
    });
    expect(rtn.exitCode).toBe(0);
    expect(rtn.error).toBe(false);
    expect(rtn.stdout).toContain('');
    expect(rtn.stderr).toBe('');

    fse.removeSync(rarPath); // Clean
  });

  testName = 'openRar';
  test(testName, function () {
    var rarPath;

    // Create the opening Rar
    rarPath = path.join(dirDestDeflate, 'My New Archive for openRar.rar');
    fse.removeSync(rarPath);
    expect(fs.existsSync(rarPath)).toBe(false);

    zlib.deflateSyncIntoRar(dirArchiving, rarPath, { dirWinRar: dirWinRar });
    expect(fs.existsSync(rarPath)).toBe(true);

    // Opening
    var dirWinRarNonExisting = 'R:\\My Custom Apps\\WinRar';
    expect(_cb(zlib.openRar, rarPath, { dirWinRar: dirWinRarNonExisting })).toThrowError();

    zlib.openRar(rarPath, { dirWinRar: dirWinRar });

    console.popup('Finished to confirm the Rar file?');
    fse.removeSync(rarPath); // Clean
  });

  testName = 'unrarSync_makesRarNameDir_dryRun';
  test(testName, function () {
    var rarName = 'My New Archive for openRar';
    var rarExe = path.join(DEF_DIR_WINRAR, EXENAME_RAR);
    var rarPath = path.join(dirDestDeflate, rarName + '.rar');
    var cmd;

    // No makesRarDir option (false)
    cmd = zlib.unrarSync(rarPath, null, { isDryRun: true });
    expect(cmd).toContain(srrd(rarExe) + ' x ');
    expect(cmd).toContain(' x -y -ri0 ');
    expect(cmd).toContain(' -ri0 ' + srrd(rarPath));
    expect(cmd).toContain(' ' + srrd(dirDestDeflate));

    // makesArchiveNameDir: false
    cmd = zlib.unrarSync(rarPath, null, {
      makesArchiveNameDir: false,
      isDryRun: true
    });
    expect(cmd).toContain(srrd(rarExe) + ' x ');
    expect(cmd).toContain(' x -y -ri0 ');
    expect(cmd).toContain(' -ri0 ' + srrd(rarPath));
    expect(cmd).toContain(' ' + srrd(dirDestDeflate));

    // makesArchiveNameDir: true
    cmd = zlib.unrarSync(rarPath, null, {
      makesArchiveNameDir: true,
      isDryRun: true
    });
    expect(cmd).toContain(srrd(rarExe) + ' x ');
    expect(cmd).toContain(' x -y -ri0 ');
    expect(cmd).toContain(' -ri0 ' + srrd(rarPath));
    expect(cmd).toContain(' ' + srrd(path.join(dirDestDeflate, rarName)));

    // Specify dest directory
    cmd = zlib.unrarSync(rarPath, dirDestUnzip, {
      isDryRun: true
    });
    expect(cmd).toContain(srrd(rarExe) + ' x ');
    expect(cmd).toContain(' x -y -ri0 ');
    expect(cmd).toContain(' -ri0 ' + srrd(rarPath));
    expect(cmd).toContain(' ' + srrd(dirDestUnzip));

    // makesArchiveNameDir: false
    cmd = zlib.unrarSync(rarPath, dirDestUnzip, {
      makesArchiveNameDir: false,
      isDryRun: true
    });
    expect(cmd).toContain(srrd(rarExe) + ' x ');
    expect(cmd).toContain(' x -y -ri0 ');
    expect(cmd).toContain(' -ri0 ' + srrd(rarPath));
    expect(cmd).toContain(' ' + srrd(dirDestUnzip));

    // makesArchiveNameDir: true
    cmd = zlib.unrarSync(rarPath, dirDestUnzip, {
      makesArchiveNameDir: true,
      isDryRun: true
    });
    expect(cmd).toContain(srrd(rarExe) + ' x ');
    expect(cmd).toContain(' x -y -ri0 ');
    expect(cmd).toContain(' -ri0 ' + srrd(rarPath));
    expect(cmd).toContain(' ' + srrd(path.join(dirDestUnzip, rarName)));
  });

  testName = 'unrarSync_makesRarNameDir';
  test(testName, function () {
    var rarName = 'My New Archive for unrar';
    var rarPath = path.join(dirDestDeflate, rarName + '.rar');
    var destPath;
    var rtn;

    // Delete a unrar archive, If existing
    fse.removeSync(rarPath);
    expect(fs.existsSync(rarPath)).toBe(false);

    // Create the unrar archive
    zlib.deflateSyncIntoRar(dirArchiving, rarPath, { dirWinRar: dirWinRar });
    expect(fs.existsSync(rarPath)).toBe(true);

    // Execute with non existing 7z.exe -> Error
    var dirWinRarNonExisting = 'R:\\My Custom Apps\\WinRar';
    expect(
      _cb( zlib.unrarSync, rarPath, dirDest, {
        dirWinRar: dirWinRarNonExisting
      })
    ).toThrowError();

    // No makesRarDir option (false)
    destPath = path.join(dirDestDeflate, path.basename(dirArchiving));
    expect(fs.existsSync(destPath)).toBe(false);

    rtn = zlib.unrarSync(rarPath, null, {
      dirWinRar: dirWinRar
    });
    expect(fs.existsSync(destPath)).toBe(true);
    // Clean
    fse.removeSync(destPath);
    expect(fs.existsSync(destPath)).toBe(false);

    // makesArchiveNameDir: false
    destPath = path.join(dirDestDeflate, path.basename(dirArchiving));
    expect(fs.existsSync(destPath)).toBe(false);

    rtn = zlib.unrarSync(rarPath, null, {
      makesArchiveNameDir: false,
      dirWinRar: dirWinRar
    });
    expect(fs.existsSync(destPath)).toBe(true);
    // Clean
    fse.removeSync(destPath);
    expect(fs.existsSync(destPath)).toBe(false);

    // makesArchiveNameDir: true -> the Rar file name folder will be created
    destPath = path.join(dirDestDeflate, rarName);
    rtn = zlib.unrarSync(rarPath, null, {
      makesArchiveNameDir: true,
      dirWinRar: dirWinRar
    });
    expect(fs.existsSync(destPath)).toBe(true);
    // Clean
    fse.removeSync(destPath);
    expect(fs.existsSync(destPath)).toBe(false);

    // Specify a dest directory
    // No makesRarDir option (false)
    destPath = path.join(dirDestUnzip, path.basename(dirArchiving));
    rtn = zlib.unrarSync(rarPath, dirDestUnzip, {
      dirWinRar: dirWinRar
    });
    expect(fs.existsSync(destPath)).toBe(true);
    // Clean
    fse.removeSync(destPath);
    expect(fs.existsSync(destPath)).toBe(false);

    // makesArchiveNameDir: false
    destPath = path.join(dirDestUnzip, path.basename(dirArchiving));
    rtn = zlib.unrarSync(rarPath, dirDestUnzip, {
      makesArchiveNameDir: false,
      dirWinRar: dirWinRar
    });
    expect(fs.existsSync(destPath)).toBe(true);
    // Clean
    fse.removeSync(destPath);
    expect(fs.existsSync(destPath)).toBe(false);
    // makesArchiveNameDir: true
    destPath = path.join(dirDestUnzip, rarName);
    rtn = zlib.unrarSync(rarPath, dirDestUnzip, {
      makesArchiveNameDir: true,
      dirWinRar: dirWinRar
    });
    expect(fs.existsSync(destPath)).toBe(true);
    // Clean
    fse.removeSync(destPath);
    expect(fs.existsSync(destPath)).toBe(false);

    fse.removeSync(rarPath);
    expect(fs.existsSync(rarPath)).toBe(false);
  });
});
