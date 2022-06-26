/* globals Wsh: false */
/* globals __dirname: false */

/* globals describe: false */
/* globals test: false */
/* globals expect: false */

// Shorthand
var util = Wsh.Util;
var path = Wsh.Path;
var fs = Wsh.FileSystem;
var fse = Wsh.FileSystemExtra;
var zlib = Wsh.ZLIB;

var isEmpty = util.isEmpty;

var _cb = function (fn/* , args */) {
  var args = Array.from(arguments).slice(1);
  return function () { fn.apply(null, args); };
};

describe('ZLIB', function () {
  var testName;

  var DEF_7ZIP_EXE = 'C:\\Program Files\\7-Zip\\7z.exe';

  var dirAssets = path.join(__dirname, 'assets');
  var dir7zip = path.join(dirAssets, '7-Zip');
  var exe7zip = path.join(dir7zip, '7z.exe');

  var dirSandbox = path.join(dirAssets, 'Sandbox');
  var dirZipping = path.join(dirSandbox, 'ZippingDir');
  var dirHideen = path.join(dirZipping, '.HiddenDir');
  var dirEmpty = path.join(dirZipping, 'EmptyDir');
  var dirSub = path.join(dirZipping, 'SubDir');
  var fileBinary = path.join(dirZipping, '20000101T010101_Binary.ico');
  var fileTextSjis = path.join(dirZipping, '20000101T010102_Text-SJIS.txt');
  var fileTextUtf8 = path.join(dirZipping, '20000101T010103_Text-UTF8.txt');
  var files1 = [fileBinary, fileTextSjis, fileTextUtf8];
  var dirDest = path.join(dirSandbox, 'DestDir');

  testName = 'scratch';
  test(testName, function () {
    // The top folder (ZippingDir) will not be included in the Zip archive.
    var cmd = zlib.deflateSync(path.join(dirZipping, '*'), null, {
      exe7zip: exe7zip
    });
    console.dir(cmd);
    return;
  });

  testName = 'deflateSync_dryRun_basic';
  test(testName, function () {
    var cmd;

    // Minimum {{{
    cmd = zlib.deflateSync(dirZipping, null, {
      isDryRun: true
    });
    expect(cmd).toContain('"' + DEF_7ZIP_EXE + '" u -tzip -ssw -r-');
    expect(cmd).toContain(' -r- "' + dirZipping + '.zip"'); // dest
    expect(cmd).toContain('.zip" @"'); // src @TODO Check tmp list
    expect(cmd).not.toContain(' -mx');
    expect(cmd).not.toContain(' -p');
    expect(cmd).not.toContain(' -w');
    expect(cmd).not.toContain(' -xr!');
    // }}}

    // Adding dest {{{
    cmd = zlib.deflateSync(dirZipping, dirDest, {
      isDryRun: true
    });
    expect(cmd).toContain('"' + DEF_7ZIP_EXE + '" u -tzip -ssw -r-');
    expect(cmd).toContain(' -r- "' + dirDest + '\\' + path.basename(dirZipping) + '.zip"'); // dest
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
    expect(cmd).toContain('"' + DEF_7ZIP_EXE + '" u -tzip -ssw -r-');
    expect(cmd).toContain(' -r- "' + path.dirname(files1[0]) + '\\' + path.basename(files1[0]) + '.zip"'); // dest
    expect(cmd).toContain('.zip" @"'); // src @TODO Check tmp list
    // expect(cmd).toContain(' "' + files1[0] + '"'); // src
    // expect(cmd).toContain(' "' + files1[1] + '"'); // src
    expect(cmd).not.toContain(' -mx');
    expect(cmd).not.toContain(' -p');
    expect(cmd).not.toContain(' -w');
    expect(cmd).not.toContain(' -xr!');
    // }}}

    // Adding dest {{{
    cmd = zlib.deflateSync(files1, dirDest, {
      isDryRun: true
    });
    expect(cmd).toContain('"' + DEF_7ZIP_EXE + '" u -tzip -ssw -r-');
    expect(cmd).toContain(' -r- "' + dirDest + '\\' + path.basename(files1[0]) + '.zip"'); // dest
    expect(cmd).toContain('.zip" @"'); // src @TODO Check tmp list
    // expect(cmd).toContain(' "' + files1[0] + '"'); // src
    // expect(cmd).toContain(' "' + files1[1] + '"'); // src
    expect(cmd).not.toContain(' -mx');
    expect(cmd).not.toContain(' -p');
    expect(cmd).not.toContain(' -w');
    expect(cmd).not.toContain(' -xr!');
    // }}}
  });

  testName = 'deflateSync_dryRun_options';
  test(testName, function () {
    var cmd;

    // Custom 7-Zip {{{
    var exe7zCustomPath = 'D:\\My Custom Apps\\7-Zip\\7z.exe';
    cmd = zlib.deflateSync(dirZipping, null, {
      exe7zip: exe7zCustomPath,
      isDryRun: true
    });
    expect(cmd).toContain('"' + exe7zCustomPath + '" u -tzip -ssw -r-');
    expect(cmd).toContain(' -r- "' + dirZipping + '.zip"'); // dest
    expect(cmd).toContain('.zip" @"'); // src @TODO Check tmp list
    expect(cmd).not.toContain(' -mx');
    expect(cmd).not.toContain(' -p');
    expect(cmd).not.toContain(' -w');
    expect(cmd).not.toContain(' -xr!');
    // }}}

    // DateCode Option {{{
    cmd = zlib.deflateSync(dirZipping, null, {
      dateCode: 'yyyyMMdd-HHmmss',
      isDryRun: true
    });
    expect(cmd).toContain('"' + DEF_7ZIP_EXE + '" u -tzip -ssw -r-');
    expect(cmd).toContain(' -r- "' + dirZipping); // dest
    expect(cmd).toMatch(/_\d{8}-\d{6}\.zip/); // dest
    expect(cmd).toContain('.zip" @"'); // src @TODO Check tmp list
    expect(cmd).not.toContain(' -mx');
    expect(cmd).not.toContain(' -p');
    expect(cmd).not.toContain(' -w');
    expect(cmd).not.toContain(' -xr!');
    // }}}

    // Compression Level {{{
    cmd = zlib.deflateSync(dirZipping, null, {
      compressLv: 'Maximum',
      isDryRun: true
    });
    expect(cmd).toContain('"' + DEF_7ZIP_EXE + '" u -tzip -ssw -r-');
    expect(cmd).toContain(' "' + dirZipping + '.zip"'); // dest
    expect(cmd).toContain('.zip" @"'); // src @TODO Check tmp list
    expect(cmd).toContain(' -mx7');
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
    // }}}

    // Password Option {{{
    var password = 'This is mY&p@ss ^_<';
    cmd = zlib.deflateSync(dirZipping, null, {
      password: password,
      isDryRun: true
    });
    expect(cmd).toContain('"' + DEF_7ZIP_EXE + '" u -tzip -ssw -r-');
    expect(cmd).toContain(' "' + dirZipping + '.zip"'); // dest
    expect(cmd).toContain('.zip" @"'); // src @TODO Check tmp list
    expect(cmd).not.toContain(' -mx');
    expect(cmd).toContain(' -p"' + password + '" -mem=AES256 "');
    expect(cmd).not.toContain(' -w');
    expect(cmd).not.toContain(' -xr!');
    // }}}

    // Working Directory Option {{{
    var tmpDir = 'R:\\RAMdisk\\tmp';
    cmd = zlib.deflateSync(dirZipping, null, {
      workingDir: tmpDir,
      isDryRun: true
    });
    expect(cmd).toContain('"' + DEF_7ZIP_EXE + '" u -tzip -ssw -r-');
    expect(cmd).toContain(' "' + dirZipping + '.zip"'); // dest
    expect(cmd).toContain('.zip" @"'); // src @TODO Check tmp list
    expect(cmd).not.toContain(' -mx');
    expect(cmd).not.toContain(' -p');
    expect(cmd).toContain(' -w"' + tmpDir + '"');
    expect(cmd).not.toContain(' -xr!');
    // }}}

    // Exclude Option {{{
    var baseNames = files1.map(function (p) {
      return path.basename(p);
    });

    cmd = zlib.deflateSync(dirZipping, null, {
      excludePaths: baseNames,
      isDryRun: true
    });
    expect(cmd).toContain('"' + DEF_7ZIP_EXE + '" u -tzip -ssw -r-');
    expect(cmd).toContain(' "' + dirZipping + '.zip"'); // dest
    expect(cmd).toContain('.zip" @"'); // src @TODO Check tmp list
    expect(cmd).not.toContain(' -mx');
    expect(cmd).not.toContain(' -p');
    expect(cmd).not.toContain(' -w');
    expect(cmd).toContain(' -x@"'); // src @TODO Check tmp list
    // expect(cmd).toContain(' -xr!"' + baseNames[0] + '"');
    // expect(cmd).toContain(' -xr!"' + baseNames[1] + '"');

    cmd = zlib.deflateSync(dirZipping, null, {
      excludePaths: baseNames,
      includesSubDir: true,
      isDryRun: true
    });
    expect(cmd).toContain(' -xr@"'); // src @TODO Check tmp list
    // }}}
  });

  testName = 'deflateSync_src_dest';
  test(testName, function () {
    var cmd;
    var destPath;

    // source: directory {{{
    // source: directory, dest: null
    destPath = dirZipping + '.zip';
    fse.removeSync(destPath);
    expect(fs.existsSync(destPath)).toBe(false);

    cmd = zlib.deflateSync(dirZipping, null, { exe7zip: exe7zip });
    expect(cmd.error).toBe(false);
    expect(isEmpty(cmd.stderr)).toBe(true);
    expect(fs.existsSync(destPath)).toBe(true);

    fse.removeSync(dirZipping + '.zip'); // Clean

    // source: directory, dest: directory (existing)
    destPath = path.join(dirDest, path.basename(dirZipping) + '.zip');
    fse.removeSync(destPath);
    expect(fs.existsSync(destPath)).toBe(false);

    cmd = zlib.deflateSync(dirZipping, dirDest, { exe7zip: exe7zip });
    expect(cmd.error).toBe(false);
    expect(isEmpty(cmd.stderr)).toBe(true);
    expect(fs.existsSync(destPath)).toBe(true);

    fse.removeSync(destPath); // Clean

    // source: directory, dest: Zip file path (Non existing)
    destPath = path.join(dirDest, 'My New Archive.zip');
    fse.removeSync(destPath);
    expect(fs.existsSync(destPath)).toBe(false);

    cmd = zlib.deflateSync(dirZipping, destPath, { exe7zip: exe7zip });
    expect(cmd.error).toBe(false);
    expect(isEmpty(cmd.stderr)).toBe(true);
    expect(fs.existsSync(destPath)).toBe(true);

    fse.removeSync(destPath); // Clean
    // }}}

    // source: any files {{{
    // source: any files, dest: null
    destPath = path.join(path.dirname(files1[0]), path.basename(files1[0]) + '.zip');
    fse.removeSync(destPath);
    expect(fs.existsSync(destPath)).toBe(false);

    cmd = zlib.deflateSync(files1, null, { exe7zip: exe7zip });
    expect(cmd.error).toBe(false);
    expect(isEmpty(cmd.stderr)).toBe(true);
    expect(fs.existsSync(destPath)).toBe(true);

    fse.removeSync(destPath); // Clean

    // source: any files, dest: directory (existing)
    destPath = path.join(dirDest, path.basename(files1[0]) + '.zip');
    fse.removeSync(destPath);
    expect(fs.existsSync(destPath)).toBe(false);

    cmd = zlib.deflateSync(files1, dirDest, { exe7zip: exe7zip });
    expect(cmd.error).toBe(false);
    expect(isEmpty(cmd.stderr)).toBe(true);
    expect(fs.existsSync(destPath)).toBe(true);

    fse.removeSync(destPath); // Clean

    // source: any files, dest: Zip file path (Non existing)
    destPath = path.join(dirDest, 'My New Archive.zip');
    fse.removeSync(destPath);
    expect(fs.existsSync(destPath)).toBe(false);

    cmd = zlib.deflateSync(files1, destPath, { exe7zip: exe7zip });
    expect(cmd.error).toBe(false);
    expect(isEmpty(cmd.stderr)).toBe(true);
    expect(fs.existsSync(destPath)).toBe(true);

    fse.removeSync(destPath); // Clean
    // }}}

    // source: wildcard (*) path {{{
    // source: wildcard (*) path, dest: null
    destPath = dirZipping + '.zip';
    fse.removeSync(destPath);
    expect(fs.existsSync(destPath)).toBe(false);

    // @NOTE The top folder (ZippingDir) will not be included in the Zip archive.
    // When specifying '\\*', All files and sub directories will be compressed.
    cmd = zlib.deflateSync(path.join(dirZipping, '*'), null, {
      exe7zip: exe7zip
    });
    expect(cmd.error).toBe(false);
    expect(isEmpty(cmd.stderr)).toBe(true);
    expect(fs.existsSync(destPath)).toBe(true);

    fse.removeSync(destPath); // Clean

    // source: wildcard path, dest: directory (existing)
    destPath = path.join(dirDest, 'xxx.zip');
    fse.removeSync(destPath);
    expect(fs.existsSync(destPath)).toBe(false);

    cmd = zlib.deflateSync(path.join(dirZipping, '*'), dirDest, {
      exe7zip: exe7zip
    });
    expect(cmd.error).toBe(false);
    expect(isEmpty(cmd.stderr)).toBe(true);
    expect(fs.existsSync(destPath)).toBe(true);

    fse.removeSync(destPath); // Clean

    // source: wildcard path, dest: Zip file path (Non existing)
    destPath = path.join(dirDest, 'My New Archive.zip');
    fse.removeSync(destPath);
    expect(fs.existsSync(destPath)).toBe(false);

    cmd = zlib.deflateSync(path.join(dirZipping, '*'), destPath, {
      exe7zip: exe7zip
    });
    expect(cmd.error).toBe(false);
    expect(isEmpty(cmd.stderr)).toBe(true);
    expect(fs.existsSync(destPath)).toBe(true);

    fse.removeSync(destPath); // Clean
    // }}}

    // source: wildcard (*.txt) path {{{
    // source: wildcard (*.txt) path, dest: null
    destPath = path.join(dirZipping, 'xxx.txt.zip');
    fse.removeSync(destPath);
    expect(fs.existsSync(destPath)).toBe(false);

    // @NOTE The top folder (ZippingDir) will not be included in the Zip archive.
    // When specifying '\\*.txt', All .txt files in only the root directory will be compressed.
    cmd = zlib.deflateSync(path.join(dirZipping, '*.txt'), null, {
      exe7zip: exe7zip
    });
    expect(cmd.error).toBe(false);
    expect(isEmpty(cmd.stderr)).toBe(true);
    expect(fs.existsSync(destPath)).toBe(true);

    fse.removeSync(destPath); // Clean

    // source: wildcard path, dest: directory (existing)
    destPath = path.join(dirDest, 'xxx.txt.zip');
    fse.removeSync(destPath);
    expect(fs.existsSync(destPath)).toBe(false);

    cmd = zlib.deflateSync(path.join(dirZipping, '*.txt'), dirDest, {
      includesSubDir: true,
      exe7zip: exe7zip
    });
    expect(cmd.error).toBe(false);
    expect(isEmpty(cmd.stderr)).toBe(true);
    expect(fs.existsSync(destPath)).toBe(true);

    fse.removeSync(destPath); // Clean

    // source: wildcard path, dest: Zip file path (Non existing)
    destPath = path.join(dirDest, 'My New Archive.zip');
    fse.removeSync(destPath);
    expect(fs.existsSync(destPath)).toBe(false);

    cmd = zlib.deflateSync(path.join(dirZipping, '*.txt'), destPath, {
      exe7zip: exe7zip
    });
    expect(cmd.error).toBe(false);
    expect(isEmpty(cmd.stderr)).toBe(true);
    expect(fs.existsSync(destPath)).toBe(true);

    fse.removeSync(destPath); // Clean
    // }}}
  });

  testName = 'deflateSync_options';
  test(testName, function () {
    var cmd;
    var destPath;

    // Custom 7-Zip
    var exe7zNonExisting = 'R:\\My Custom Apps\\7-Zip\\7z.exe';
    expect(_cb(zlib.deflateSync, dirZipping, null, {
      exe7zip: exe7zNonExisting
    })).toThrowError();

    // DateCode Option {{{
    cmd = zlib.deflateSync(dirZipping, dirDest, {
      exe7zip: exe7zip,
      dateCode: 'yyyyMMdd-HHmmss'
    });
    expect(cmd.error).toBe(false);

    var matches = cmd.stdout.match(/Creating archive: (.+\.zip)/i);
    expect(matches).toHaveLength(2);

    var createdZipPath = matches[1].trim();
    expect(createdZipPath).toMatch(/_\d{8}-\d{6}\.zip$/); // dest
    expect(fs.existsSync(createdZipPath)).toBe(true);

    fse.removeSync(createdZipPath); // Clean
    // }}}

    // Compression Level {{{
    destPath = path.join(dirDest, path.basename(dirZipping) + '.zip');
    fse.removeSync(destPath);
    expect(fs.existsSync(destPath)).toBe(false);

    cmd = zlib.deflateSync(dirZipping, dirDest, {
      compressLv: 9,
      exe7zip: exe7zip
    });
    expect(cmd.error).toBe(false);
    expect(isEmpty(cmd.stderr)).toBe(true);
    expect(fs.existsSync(destPath)).toBe(true);

    // @TODO compare each file size

    fse.removeSync(destPath); // Clean
    // }}}

    // Password Option {{{
    destPath = path.join(dirDest, path.basename(dirZipping) + '.zip');
    fse.removeSync(destPath);
    expect(fs.existsSync(destPath)).toBe(false);

    var password = 'This is mY&p@ss ^_<';
    cmd = zlib.deflateSync(dirZipping, dirDest, {
      password: password,
      exe7zip: exe7zip
    });
    expect(cmd.error).toBe(false);
    expect(isEmpty(cmd.stderr)).toBe(true);
    expect(fs.existsSync(destPath)).toBe(true);

    // @TODO decrypt the Zip file by the password.

    fse.removeSync(destPath); // Clean
    // }}}
  });

  testName = 'deflateSync_exclude_option';
  test(testName, function () {
    var cmd;
    var destPath;

    // Exclude Option
    destPath = path.join(dirDest, path.basename(dirZipping) + '.zip');
    fse.removeSync(destPath);
    expect(fs.existsSync(destPath)).toBe(false);

    var baseNames = files1.map(function (p) {
      return path.basename(p);
    });

    // @NOTE Since `includesSubDir` option is not specified, all files are compressed. The exclusive list is useless.
    cmd = zlib.deflateSync(dirZipping, dirDest, {
      excludePaths: baseNames,
      exe7zip: exe7zip
    });
    expect(cmd.error).toBe(false);
    expect(isEmpty(cmd.stderr)).toBe(true);
    expect(fs.existsSync(destPath)).toBe(true);

    // @TODO Confirm the content in the file.

    fse.removeSync(destPath); // Clean

    // Specify `includesSubDir: true`
    cmd = zlib.deflateSync(dirZipping, dirDest, {
      excludePaths: baseNames,
      includesSubDir: true,
      exe7zip: exe7zip
    });
    expect(cmd.error).toBe(false);
    expect(isEmpty(cmd.stderr)).toBe(true);
    expect(fs.existsSync(destPath)).toBe(true);

    // @TODO Confirm the content in the file.

    fse.removeSync(destPath); // Clean

    // Specify `includesSubDir: true`
    cmd = zlib.deflateSync(dirZipping, dirDest, {
      excludePaths: ['*SJIS*'],
      includesSubDir: true,
      outputsLog: true,
      exe7zip: exe7zip
    });
    expect(cmd.error).toBe(false);
    expect(isEmpty(cmd.stderr)).toBe(true);
    expect(fs.existsSync(destPath)).toBe(true);

    // @TODO Confirm the content in the file.

    fse.removeSync(destPath); // Clean
  });

  testName = 'deflateSync_updateMode_option';
  test(testName, function () {
    var cmd;
    var destPath;

    // Create a source Zip file
    destPath = path.join(dirDest, 'My New Archive.zip');
    fse.removeSync(destPath);
    expect(fs.existsSync(destPath)).toBe(false);

    cmd = zlib.deflateSync(path.join(dirZipping, '*SJIS*'), destPath, {
      outputsLog: true,
      exe7zip: exe7zip
    });
    console.dir(cmd);
    expect(cmd.error).toBe(false);
    expect(isEmpty(cmd.stderr)).toBe(true);
    expect(fs.existsSync(destPath)).toBe(true);

    // @TODO Confirm the content in the file.

    // updateMode: sync (default)
    cmd = zlib.deflateSync(path.join(dirZipping, '*UTF8*'), destPath, {
      outputsLog: true,
      exe7zip: exe7zip
    });
    expect(isEmpty(cmd.stderr)).toBe(true);
    expect(fs.existsSync(destPath)).toBe(false);

    console.popup('Check the Zip');
    // @TODO Confirm the content in the file.

    return;
    fse.removeSync(destPath); // Clean

  });

  // @TODO Add more tests
});
