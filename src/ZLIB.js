/* globals Wsh: false */

(function () {
  if (Wsh && Wsh.ZLIB) return;

  /**
   * This module provides helper WSH (Windows Script Host) functions that handle archiver apps (7-Zip and RAR).
   *
   * @namespace ZLIB
   * @memberof Wsh
   * @requires {@link https://github.com/tuckn/WshChildProcess|tuckn/WshChildProcess}
   */
  Wsh.ZLIB = {};

  // Shorthands
  var util = Wsh.Util;
  var CD = Wsh.Constants;
  var path = Wsh.Path;
  var os = Wsh.OS;
  var fs = Wsh.FileSystem;
  var fse = Wsh.FileSystemExtra;
  var child_process = Wsh.ChildProcess;

  var objAdd = Object.assign;
  var obtain = util.obtainPropVal;
  var includes = util.includes;
  var isEmpty = util.isEmpty;
  var isTrueLike = util.isTrueLike;
  var isSolidArray = util.isSolidArray;
  var isSolidString = util.isSolidString;
  var isPureNumber = util.isPureNumber;
  var isSameStr = util.isSameMeaning;
  var startsWith = util.startsWith;
  var insp = util.inspect;
  var parseDate = util.createDateString;
  var srrd = os.surroundCmdArg;
  var exec = child_process.exec;
  var execFileSync = child_process.execFileSync;

  var zlib = Wsh.ZLIB;

  /** @constant {string} */
  var MODULE_TITLE = 'WshZLIB/ZLIB.js';

  var DEF_DIR_7ZIP = 'C:\\Program Files\\7-Zip';
  var EXENAME_7Z = '7z.exe';
  var EXENAME_7ZFM = '7zFM.exe';

  /**
   * @name DEF_7Z_EXE
   * @constant {string}
   */
  var DEF_7Z_EXE = path.join(DEF_DIR_7ZIP, EXENAME_7Z);

  /**
   * @name DEF_7ZFM_EXE
   * @constant {string}
   */
  var DEF_7ZFM_EXE = path.join(DEF_DIR_7ZIP, EXENAME_7ZFM);

  /**
   * @name DEF_DIR_WINRAR
   * @constant {string}
   */
  var DEF_DIR_WINRAR = 'C:\\Program Files\\WinRAR';

  /** @constant {string} */
  var EXENAME_WINRAR = 'WinRar.exe';

  /** @constant {string} */
  var EXENAME_RAR = 'Rar.exe';

  var throwErrInvalidValue = function (functionName, argName, typeErrVal) {
    util.throwValueError(argName, MODULE_TITLE, functionName, typeErrVal);
  };

  var throwErrNonStr = function (functionName, typeErrVal) {
    util.throwTypeError('string', MODULE_TITLE, functionName, typeErrVal);
  };

  /**
   * console logging
   *
   * @private
   * @function _log
   * @param {boolean} sw - Shows a log
   * @param {string} text - The logging text
   * @returns {void}
   */
  var _log = function (sw, text) {
    if (sw) console.log(text);
  };

  /**
   * @typedef {object} typeDeflateResult
   * @property {string} command - A executable command line
   * @property {string} archivedPath - An archived file path
   * @property {boolean} error - Error or not.
   * @property {string} stdout - Std Output.
   * @property {string} stderr - Std Error.
   */

  // zlib._createTmpListFile {{{
  /**
   * Creates a temporary list file.
   *
   * @function _createTmpListFile
   * @memberof Wsh.ZLIB
   * @param {string[]|string} paths - The file paths.
   * @param {object} [options] - Optional parameters.
   * @param {string} [options.encoding='utf8'] - The character encoding.
   * @param {string} [options.eol='\n'] - The character of EOL (end of line).
   * @returns {string} - The created temporary file path.
   */
  zlib._createTmpListFile = function (paths, options) {
    var FN = 'zlib._createTmpListFile';

    if (!isSolidArray(paths) && !isSolidString(paths)) {
      throwErrInvalidValue(FN, 'paths', paths);
    }

    // Setting excluding filepaths (-x)
    var encoding = obtain(options, 'encoding', 'utf8');
    var eol = obtain(options, 'eol', '\n');
    var writeData;

    if (isSolidArray(paths)) {
      writeData = paths.reduce(function (acc, p) {
        return acc + p + eol;
      }, '');
    } else {
      writeData = paths + eol;
    }

    return fs.writeTmpFileSync(writeData, { encoding: encoding });
  }; // }}}

  // zlib._makeDestArchivePath {{{
  /**
   * Makes An archive file path.
   *
   * @function _makeDestArchivePath
   * @memberof Wsh.ZLIB
   * @param {string} ext - The archive file extension (ex: ".zip")
   * @param {string[]|string} paths - The archiving file paths.
   * @param {string} [dest] - A destination path.
   * @returns {string} - The created archive file path.
   */
  zlib._makeDestArchivePath = function (ext, paths, dest) {
    var FN = 'zlib._makeDestArchivePath';

    if (!isSolidArray(paths) && !isSolidString(paths)) {
      throwErrInvalidValue(FN, 'paths', paths);
    }

    var destPath = dest;
    var srcPath1 = isSolidArray(paths) ? paths[0] : paths;

    if (isEmpty(destPath)) {
      if (fs.existsSync(srcPath1) && fs.statSync(srcPath1).isDirectory()) {
        destPath = srcPath1 + ext;
      } else if (/\\\*$/.test(srcPath1)) {
        destPath = path.dirname(srcPath1).replace(/\\\*$/, '') + ext;
      } else {
        destPath = srcPath1.replace(/\*/g, 'xxx') + ext;
      }
    } else if (fs.existsSync(destPath) && fs.statSync(destPath).isDirectory()) {
      // When specified the dest and it's a existing directory,
      if (fs.existsSync(srcPath1) && fs.statSync(srcPath1).isDirectory()) {
        destPath = path.join(destPath, path.basename(srcPath1) + ext);
      } else {
        destPath = path.join(
          destPath,
          path.basename(srcPath1).replace(/\*/g, 'xxx') + ext
        );
      }
    }

    return destPath;
  }; // }}}

  // 7-Zip Command Line User's Guide
  /**
   * [7-Zip Command Line Version User's Guide](https://sevenzip.osdn.jp/chm/cmdline/index.htm)
7-Zip (a) 22.00 (x64) : Copyright (c) 1999-2022 Igor Pavlov : 2022-06-15

Usage: 7za <command> [<switches>...] <archive_name> [<file_names>...] [@listfile]

<Commands>
  a : Add files to archive
  b : Benchmark
  d : Delete files from archive
  e : Extract files from archive (without using directory names)
  h : Calculate hash values for files
  i : Show information about supported formats
  l : List contents of archive
  rn : Rename files in archive
  t : Test integrity of archive
  u : Update files to archive
  x : eXtract files with full paths

<Switches>
  -- : Stop switches and @listfile parsing
  -ai[r[-|0]]{@listfile|!wildcard} : Include archives
  -ax[r[-|0]]{@listfile|!wildcard} : eXclude archives
  -ao{a|s|t|u} : set Overwrite mode
  -an : disable archive_name field
  -bb[0-3] : set output log level
  -bd : disable progress indicator
  -bs{o|e|p}{0|1|2} : set output stream for output/error/progress line
  -bt : show execution time statistics
  -i[r[-|0]]{@listfile|!wildcard} : Include filenames
  -m{Parameters} : set compression Method
    -mmt[N] : set number of CPU threads
    -mx[N] : set compression level: -mx1 (fastest) ... -mx9 (ultra)
  -o{Directory} : set Output directory
  -p{Password} : set Password
  -r[-|0] : Recurse subdirectories for name search
  -sa{a|e|s} : set Archive name mode
  -scc{UTF-8|WIN|DOS} : set charset for for console input/output
  -scs{UTF-8|UTF-16LE|UTF-16BE|WIN|DOS|{id}} : set charset for list files
  -scrc[CRC32|CRC64|SHA1|SHA256|*] : set hash function for x, e, h commands
  -sdel : delete files after compression
  -seml[.] : send archive by email
  -sfx[{name}] : Create SFX archive
  -si[{name}] : read data from stdin
  -slp : set Large Pages mode
  -slt : show technical information for l (List) command
  -snh : store hard links as links
  -snl : store symbolic links as links
  -sni : store NT security information
  -sns[-] : store NTFS alternate streams
  -so : write data to stdout
  -spd : disable wildcard matching for file names
  -spe : eliminate duplication of root folder for extract command
  -spf : use fully qualified file paths
  -ssc[-] : set sensitive case mode
  -sse : stop archive creating, if it can't open some input file
  -ssp : do not change Last Access Time of source files while archiving
  -ssw : compress shared files
  -stl : set archive timestamp from the most recently modified file
  -stm{HexMask} : set CPU thread affinity mask (hexadecimal number)
  -stx{Type} : exclude archive type
  -t{Type} : Set type of archive
  -u[-][p#][q#][r#][x#][y#][z#][!newArchiveName] : Update options
  -v{Size}[b|k|m|g] : Create volumes
  -w[{path}] : assign Work directory. Empty path means a temporary directory
  -x[r[-|0]]{@listfile|!wildcard} : eXclude filenames
  -y : assume Yes on all queries
  */

  // zlib.deflateSync {{{
  /**
   * @typedef {object} typeDeflateZipOption
   * @property {string} [exe7z=DEF_7ZIP_EXE] - A custom .exe path of 7-ZIP.
   * @property {string} [workingDir] - Working directory
   * @property {boolean} [updateMode='sync'] - A method of overwriting an existing dest Zip file. "sync" (default) or "add"
   * @property {boolean} [includesSubDir] - How to interpret the specified path (src, dest, excludingFiles). default: recurse subdirectories only when using wildcard. true: recurse subdirectories. false: disable recurse subdirectories.
   * @property {string[]|string} [excludingFiles] - You should specify relative paths with a wildcard. Cannot establish absolute paths.
   * @property {number|string} [compressLv=5] Level of compression. 1,3,5,7,9 or Fastest, Fast, Normal, Maximum, Ultra
   * @property {string} [password] - Specifies password. File names will not be encrypted in Zip archive.
   * @property {string} [dateCode] - If specify "yyyy-MM-dd" to Zipfile name is <name>_yyyy-MM-dd.zip
   * @property {boolean} [savesTmpList=false] - Does not remove temporary file list.
   * @property {boolean} [outputsLog=false] - Output console logs.
   * @property {boolean} [isDryRun=false] - No execute, returns the string of command.
   */

  /**
   * Compresses and encrypts files into ZIP with 7-Zip.
   *
   * @example
   * var zlib = Wsh.ZLIB; // Shorthand
   * var path = Wsh.Path;
   *
   * var exe7z = path.join(__dirname, '.\\bin\\7-Zip\\7z.exe');
   *
   * // Zipping a directory
   * var rtn = zlib.deflateSync('C:\\My Data', 'D:\\Backup.zip', {
   *   exe7z: exe7z
   * });
   *
   * console.dir(rtn);
   * // Outputs:
   * // { command: "C:\My script\bin\7-Zip\7z.exe" u -tzip -ssw -r0 "D:\\Backup.zip" @"C:\Users\<Your Name>\AppData\Local\Temp\fs-writeTmpFileSync_rad3CD32.tmp"",
   * //   exitCode: 0,
   * //   stdout: "
   * // 7-Zip 22.00 (x64) : Copyright (c) 1999-2022 Igor Pavlov : 2022-06-15
   * // ...
   * // ..
   * // Everything is Ok
   * // ",
   * //   stderr: "",
   * //   error: false,
   * //   archivedPath: "D:\\Backup.zip" }
   *
   * // With many options
   * var rtn = zlib.deflateSync('C:\\My Data\\*.txt', 'D:\\Backup.zip', {
   *   dateCode: 'yyyyMMdd-HHmmss',
   *   compressLv: 9,
   *   password: 'This is mY&p@ss ^_<',
   *   excludingFiles: ['*SJIS*'],
   *   includesSubDir: false,
   *   exe7z: exe7z
   * });
   *
   * console.dir(rtn);
   * // Outputs:
   * // { command: "C:\My script\bin\7-Zip\7z.exe" u -tzip -ssw -r- -xr-@"C:\Users\<Your Name>\AppData\Local\Temp\fs-writeTmpFileSync_radD1C8B.tmp" -mx9 -p"This is mY&p@ss ^_<" -mem=AES256 "D:\\Backup_20220722-100513.zip" @"C:\Users\<Your Name>\AppData\Local\Temp\fs-writeTmpFileSync_radA1BD8.tmp"",
   * //   exitCode: 0,
   * //   stdout: "
   * // 7-Zip 22.00 (x64) : Copyright (c) 1999-2022 Igor Pavlov : 2022-06-15
   * // ...
   * // ..
   * // Files read from disk: 5
   * // Archive size: 2291 bytes (3 KiB)
   * // Everything is Ok
   * // ",
   * //   stderr: "",
   * //   error: false,
   * //   archivedPath: "D:\\Backup_20220722-100513.zip" }
   * @function deflateSync
   * @memberof Wsh.ZLIB
   * @param {string[]|string} paths - The compressed file paths. If a directory is specified, all of them are compressed, including sub directories. If you use a wildcard to specify the paths, you can use the R option to control the files contained in the sub directories.
   * @param {string} [dest] - The filepath or directory of destination ZIP.
   * @param {typeDeflateZipOption} [options] - Optional parameters.
   * @returns {typeDeflateResult|string} - See typeDeflateResult. If options.isDryRun is true, returns string.
   */
  zlib.deflateSync = function (paths, dest, options) {
    var FN = 'zlib.deflateSync';

    if (!isSolidArray(paths) && !isSolidString(paths)) {
      throwErrInvalidValue(FN, 'paths', paths);
    }

    var outputsLog = obtain(options, 'outputsLog', false);
    var isDryRun = obtain(options, 'isDryRun', false);

    // Setting the arguments
    var args =[];

    // _log(outputsLog, 'a: Add files to archive');
    _log(outputsLog, 'u : Update files to archive');
    _log(outputsLog, '-tzip: Set ZIP type of archive');
    _log(outputsLog, '-ssw: Compress shared(locked) files');
    // _log(outputsLog, '-snh : store hard links as links');
    // _log(outputsLog, '-snl : store symbolic links as links');

    // args.push('u', '-tzip', '-ssw', '-snh', '-snl');
    args.push('u', '-tzip', '-ssw');

    // Assign the working directory (-w[{path}])
    var workingDir = obtain(options, 'workingDir', null);
    if (isSolidString(workingDir)) {
      _log(outputsLog, '-w"' + workingDir + '": Assign the working directory');
      args.push('-w"' + workingDir + '"');
    }

    // Setting the updating method and adding the dest path to args.
    var updateMode = obtain(options, 'updateMode', 'SYNC');
    if (fs.existsSync(destZip)) {
      if (isSameStr(updateMode, 'SYNC')) {
        args.push('-up0q0r2x1y1z1w2');
      }
    }

    /*
     * Setting Recurse switch
     * -r 	Enable recurse subdirectories.
     *   ex: "C:\hoge\foo.exe" -> Targets all foo.exe in all sub folders.
     * -r- 	Disable recurse subdirectories. This option is default for all commands.
     *   ex1: "C:\hoge\foo.exe" -> Targets only "C:\hoge\foo.exe"
     *   ex2: "C:\hoge\*foo.exe" -> Targets only "C:\hoge\foo.exe"
     * -r0 	Enable recurse subdirectories only for wildcard names.
     *   ex1: "C:\hoge\*foo.exe" -> Targets all foo.exe in all sub subdirectories.
     *   ex2: "C:\hoge\*\foo.exe" -> Targets foo.exe in subdirectories. Exclude "C:\hoge\foo.exe" and files in sub-sub-directories ex. "C:\hoge\AAA\BBB\foo.exe".
     */
    var includesSubDir = obtain(options, 'includesSubDir', null);
    var rc = '';

    if (includesSubDir === true) {
      _log(outputsLog, '-r: Enable recurse subdirectories.');
      args.push('-r');
      rc = 'r';
    } else if (includesSubDir === false) {
      _log(outputsLog, '-r: Disable recurse subdirectories.');
      args.push('-r-');
      rc = 'r-';
    } else {
      _log(
        outputsLog,
        '-r0: Enable recurse subdirectories only for wildcard names.'
      );
      args.push('-r0');
      rc = 'r0';
    }

    // Setting excluding filepaths (-x)
    var excludingFiles = obtain(options, 'excludingFiles', null);
    var excludeListFile;

    if (!isEmpty(excludingFiles)) {
      excludeListFile = zlib._createTmpListFile(excludingFiles);
      args.push('-x' + rc + '@"' + excludeListFile + '"');

      _log(outputsLog, '-x: Set excluding filepaths ' + insp(excludingFiles));
      _log(outputsLog, 'Excluding list file: ' + excludeListFile);
    }


    // Setting the level of compression (-mx1(fastest) ... -mx9(ultra)')
    var compressLv = obtain(options, 'compressLv', null);
    if (isPureNumber(compressLv) || isSolidString(compressLv)) {
      var lv = compressLv.toString().toUpperCase().trim();
      var mxN;

      if (lv === 'FASTEST' || lv === '1') {
        mxN = '-mx1';
      } else if (lv === 'FAST' || lv === '3') {
        mxN = '-mx3';
      } else if (lv === 'MAXIMUM' || lv === '7') {
        mxN = '-mx7';
      } else if (lv === 'ULTRA' || lv === '9') {
        mxN = '-mx9';
      } else {
        mxN = '-mx' + lv;
      }

      _log(outputsLog, mxN + ': Set compression level (-mx1(fastest) ... -mx9(ultra)');
      args.push(mxN);
    }

    // Setting a zip password (-p{Password})
    // @note File names will be not encrypted in Zip archive.
    // Encode an archive header option, -mhe=on can be used by .7z only!
    var password = obtain(options, 'password', null);
    if (isSolidString(password)) {
      _log(outputsLog, '-p"****": Set the password (-mem=AES256)');
      args.push('-p"' + password + '"', '-mem=AES256');
    }

    // Setting the destination ZIP file path
    var destZip = zlib._makeDestArchivePath('.zip', paths, dest);

    // Appends the current date string to an archive name.
    var dateCode = obtain(options, 'dateCode', null);
    if (isSolidString(dateCode)) {
      destZip = destZip.replace(/(\.zip)?$/i, '_' + parseDate(dateCode) + '$1');
    }

    var destZipDir = path.dirname(destZip);
    if (!fs.existsSync(destZipDir) && !isDryRun) fse.ensureDirSync(destZipDir);

    // Adding the dest Zip path and source paths.
    args.push(destZip);

    // Setting source file paths
    var srcListFile = zlib._createTmpListFile(paths);
    args.push('@"' + srcListFile + '"');

    _log(outputsLog, 'Set compressed filepaths ' + insp(paths));
    _log(outputsLog, 'Compressed list file: ' + excludeListFile);

    // Executing
    // Setting the .exe path
    var exe7z = obtain(options, 'exe7z', DEF_7Z_EXE);
    var op = objAdd({ isDryRun: isDryRun }, options);

    _log(outputsLog, 'exe path: ' + exe7z);
    _log(outputsLog, 'arguments: ' + insp(args));
    _log(outputsLog, 'options: ' + insp(op));

    var rtn = execFileSync(exe7z, args, op);
    rtn.archivedPath = destZip; // provisional

    // Remove lists
    var savesTmpList = obtain(options, 'savesTmpList', false);
    if (!savesTmpList) {
      if (excludeListFile) fse.removeSync(excludeListFile);
      fse.removeSync(srcListFile);
    }

    _log(outputsLog, insp(rtn));
    if (isDryRun) return rtn; // rtn is {string}

    // Setting the true archived file path
    if (rtn.stdout && includes(rtn.stdout, 'Creating archive: ')) {
      rtn.archivedPath = rtn.stdout.match(/Creating archive: (.+)\r\n/)[1];
    }

    // Exit Code Handling
    // 0: No error
    if (rtn.exitCode === 0) {
      _log(outputsLog, 'No error');
      rtn.error = false;
      return rtn;
    }

    // 1: Warning (Non fatal error(s)).
    //   For example, one or more files were locked by some other application,
    //   so they were not compressed.
    if (rtn.exitCode === 1) {
      _log(outputsLog, 'Warning. Non fatal error(s).');
      rtn.error = false;
      return rtn;
    }

    // 2: Fatal Error
    if (rtn.exitCode === 2) {
      throw new Error(
        '[ERROR] 7-Zip: Fatal Error\n'
        + ' ' + insp(rtn)
        + '  at ' + FN + ' (' + MODULE_TITLE + ')'
      );
    }

    // 7: Command line error
    if (rtn.exitCode === 7) {
      throw new Error(
        '[ERROR] 7-Zip: Command line error\n'
        + ' ' + insp(rtn)
        + '  at ' + FN + ' (' + MODULE_TITLE + ')'
      );
    }

    // 8: Not enough memory for operation
    if (rtn.exitCode === 8) {
      throw new Error(
        '[ERROR] 7-Zip: Not enough memory for operation\n'
        + ' ' + insp(rtn)
        + '  at ' + FN + ' (' + MODULE_TITLE + ')'
      );
    }

    // 255: User stopped the process
    if (rtn.exitCode === 255) {
      throw new Error(
        '[ERROR] 7-Zip: User stopped the process\n'
        + ' ' + insp(rtn)
        + '  at ' + FN + ' (' + MODULE_TITLE + ')'
      );
    }

    throw new Error(
      '[UNKNOWN EXIT CODE] The compressing process probably failed\n'
      + ' ' + insp(rtn)
      + '  at ' + FN + ' (' + MODULE_TITLE + ')'
    );
  }; // }}}

  // zlib.openZip {{{
  /**
   * Open the archive file with 7-Zip.
   *
   * @function openZip
   * @memberof Wsh.ZLIB
   * @param {string} archive - An archive filepath
   * @param {object} [options] - Optional parameters.
   * @param {string} [options.exe7zFM=DEF_7ZFM_EXE] - A custom .exe path of 7-ZIP file manager.
   * @param {string} [options.winStyle='activeDef']
   * @returns {void}
   */
  zlib.openZip = function (archive, options) {
    var FN = 'zlib.openZip';

    if (!isSolidString(archive)) throwErrNonStr(FN, archive);

    var filePath = path.resolve(archive);

    // Setting the .exe path
    var exe7zFM = obtain(options, 'exe7zFM', DEF_7ZFM_EXE);

    var winStyle = obtain(options, 'winStyle', CD.windowStyles.activeDef);
    var op = objAdd({ shell: false, winStyle: winStyle }, options);
    var command = srrd(exe7zFM) + ' ' + srrd(filePath);

    // Executing
    exec(command, op);
  }; // }}}

  // zlib.unzipSync {{{
  /**
   * Extract files from an archive with 7-Zip.
   *
   * @function unzipSync
   * @memberof Wsh.ZLIB
   * @param {string} archive - The archive file path
   * @param {string} [destDir] - The output directory path.
   * @param {object} [options] - Optional parameters.
   * @param {string} [options.exe7z=DEF_7ZIP_EXE] - A custom .exe path of 7-ZIP.
   * @param {string} [options.password] - Specifies password.
   * @param {string} [options.workingDir] - Working directory
   * @param {boolean} [options.makesDestDir=false] - Makes the destination directory. If it is not existing.
   * @param {boolean} [options.makesArchiveNameDir=false] - Makes a new directory with archive file name
   * @param {boolean} [options.outputsLog=false] - Output console logs.
   * @param {boolean} [options.isDryRun=false] - No execute, returns the string of command.
   * @returns {object} - See {@link https://docs.tuckn.net/WshChildProcess/global.html#typeRunSyncReturn|typeRunSyncReturn}.
   */
  zlib.unzipSync = function (archive, destDir, options) {
    var FN = 'zlib.unzipSync';

    if (!isSolidString(archive)) throwErrNonStr(FN, archive);

    var outputsLog = obtain(options, 'outputsLog', false);
    var isDryRun = obtain(options, 'isDryRun', false);

    // Setting the arguments
    var args = [];

    _log(outputsLog, 'x: eXtract files with full paths');
    args.push('x');

    // Setting a zip password (-p{Password})
    var password = obtain(options, 'password', null);
    if (!isEmpty(password)) {
      _log(outputsLog, '-p"****": Set the password (-mem=AES256)');
      args.push('-p"' + password + '"', '-mem=AES256');
    }

    // Assign the working directory (-w[{path}])
    var workingDir = obtain(options, 'workingDir', null);
    if (!isEmpty(workingDir)) {
      _log(outputsLog, '-w"' + workingDir + '": Assign the working directory');
      args.push('-w"' + workingDir + '"');
    }

    var srcPath = path.resolve(archive);
    args.push(srcPath);

    // Setting the output directory path.
    // If it is not specified, set the srcPath directory.
    if (isEmpty(destDir)) destDir = path.dirname(srcPath);

    destDir = path.resolve(destDir);

    // Creating the output directory
    if (!fs.existsSync(destDir) && obtain(options, 'makesDestDir', false)) {
      _log(outputsLog, 'Creating the dest directory');
      if (!isDryRun) fse.ensureDirSync(destDir);
    }

    if (obtain(options, 'makesArchiveNameDir', false)) {
      destDir = path.join(destDir, path.parse(srcPath).name);
      _log(outputsLog, 'Creating the Zip name directory');
      if (!isDryRun) fse.ensureDirSync(destDir);
    }

    _log(outputsLog, '-o: Set output directory. "' + destDir + '"');

    args.push('-o"' + destDir + '"', '-y');

    // Executing
    // Setting the .exe path
    var exe7z = obtain(options, 'exe7z', DEF_7Z_EXE);
    var op = objAdd({ isDryRun: isDryRun }, options);

    _log(outputsLog, 'exe path: ' + exe7z);
    _log(outputsLog, 'arguments: ' + insp(args));
    _log(outputsLog, 'options: ' + insp(op));

    var rtn = execFileSync(exe7z, args, op);

    _log(outputsLog, insp(rtn));
    if (isDryRun) return rtn; // rtn is {string}

    // Exit values
    // 0: No error
    if (rtn.exitCode === 0) {
      _log(outputsLog, 'No error');
      rtn.error = false;
      return rtn;
    }

    // 1: Warning (Non fatal error(s)). For example, one or more files were
    //  locked by some other application, so they were not compressed.
    if (rtn.exitCode === 1) {
      _log(outputsLog, 'Warning. Non fatal error(s).');
      rtn.error = false;
      return rtn;
    }

    // 2: Fatal error.
    if (rtn.exitCode === 2) {
      throw new Error(
        '[ERROR] 7-Zip: Fatal Error\n'
        + ' ' + insp(rtn)
        + '  at ' + FN + ' (' + MODULE_TITLE + ')'
      );
    }

    // 3: Command line error.
    if (rtn.exitCode === 3) {
      throw new Error(
        '[ERROR] 7-Zip: Command line error\n'
        + ' ' + insp(rtn)
        + '  at ' + FN + ' (' + MODULE_TITLE + ')'
      );
    }

    // 5: Not enough memory for operation.
    if (rtn.exitCode === 5) {
      throw new Error(
        '[ERROR] 7-Zip: Not enough memory for operation\n'
        + ' ' + insp(rtn)
        + '  at ' + FN + ' (' + MODULE_TITLE + ')'
      );
    }

    // 255: User stopped the process.
    if (rtn.exitCode === 255) {
      throw new Error(
        '[ERROR] 7-Zip: User stopped the process\n'
        + ' ' + insp(rtn)
        + '  at ' + FN + ' (' + MODULE_TITLE + ')'
      );
    }

    throw new Error(
      '[UNKNOWN EXIT CODE] The unzip process probably failed\n'
      + ' ' + insp(rtn)
      + '  at ' + FN + ' (' + MODULE_TITLE + ')'
    );
  }; // }}}

  /**
   * [WinRAR archiver, a powerful tool to process RAR and ZIP files](https://www.rarlab.com/)
RAR 6.11 x64   Copyright (c) 1993-2022 Alexander Roshal   3 Mar 2022
Trial version             Type 'rar -?' for help

Usage:     rar <command> -<switch 1> -<switch N> <archive> <files...>
               <@listfiles...> <path_to_extract\>

<Commands>
  a             Add files to archive
  c             Add archive comment
  ch            Change archive parameters
  cw            Write archive comment to file
  d             Delete files from archive
  e             Extract files without archived paths
  f             Freshen files in archive
  i[par]=<str>  Find string in archives
  k             Lock archive
  l[t[a],b]     List archive contents [technical[all], bare]
  m[f]          Move to archive [files only]
  p             Print file to stdout
  r             Repair archive
  rc            Reconstruct missing volumes
  rn            Rename archived files
  rr[N]         Add data recovery record
  rv[N]         Create recovery volumes
  s[name|-]     Convert archive to or from SFX
  t             Test archive files
  u             Update files in archive
  v[t[a],b]     Verbosely list archive contents [technical[all],bare]
  x             Extract files with full path

<Switches>
  -             Stop switches scanning
  @[+]          Disable [enable] file lists
  ac            Clear Archive attribute after compression or extraction
  ad[1,2]       Alternate destination path
  ag[format]    Generate archive name using the current date
  ai            Ignore file attributes
  ao            Add files with Archive attribute set
  ap<path>      Set path inside archive
  as            Synchronize archive contents
  c-            Disable comments show
  cfg-          Disable read configuration
  cl            Convert names to lower case
  cu            Convert names to upper case
  df            Delete files after archiving
  dh            Open shared files
  dr            Delete files to Recycle Bin
  ds            Disable name sort for solid archive
  dw            Wipe files after archiving
  e[+]<attr>    Set file exclude and include attributes
  ed            Do not add empty directories
  ep            Exclude paths from names
  ep1           Exclude base directory from names
  ep2           Expand paths to full
  ep3           Expand paths to full including the drive letter
  ep4<path>     Exclude the path prefix from names
  f             Freshen files
  hp[password]  Encrypt both file data and headers
  ht[b|c]       Select hash type [BLAKE2,CRC32] for file checksum
  id[c,d,n,p,q] Display or disable messages
  ieml[addr]    Send archive by email
  ierr          Send all messages to stderr
  ilog[name]    Log errors to file
  inul          Disable all messages
  ioff[n]       Turn PC off after completing an operation
  isnd[-]       Control notification sounds
  iver          Display the version number
  k             Lock archive
  kb            Keep broken extracted files
  log[f][=name] Write names to log file
  m<0..5>       Set compression level (0-store...3-default...5-maximal)
  ma[4|5]       Specify a version of archiving format
  mc<par>       Set advanced compression parameters
  md<n>[k,m,g]  Dictionary size in KB, MB or GB
  me[par]       Set encryption parameters
  ms[ext;ext]   Specify file types to store
  mt<threads>   Set the number of threads
  n<file>       Additionally filter included files
  n@            Read additional filter masks from stdin
  n@<list>      Read additional filter masks from list file
  o[+|-]        Set the overwrite mode
  oc            Set NTFS Compressed attribute
  oh            Save hard links as the link instead of the file
  oi[0-4][:min] Save identical files as references
  ol[a]         Process symbolic links as the link [absolute paths]
  oni           Allow potentially incompatible names
  op<path>      Set the output path for extracted files
  or            Rename files automatically
  os            Save NTFS streams
  ow            Save or restore file owner and group
  p[password]   Set password
  qo[-|+]       Add quick open information [none|force]
  r             Recurse subdirectories
  r-            Disable recursion
  r0            Recurse subdirectories for wildcard names only
  ri<P>[:<S>]   Set priority (0-default,1-min..15-max) and sleep time in ms
  rr[N]         Add data recovery record
  rv[N]         Create recovery volumes
  s[<N>,v[-],e] Create solid archive
  s-            Disable solid archiving
  sc<chr>[obj]  Specify the character set
  sfx[name]     Create SFX archive
  si[name]      Read data from standard input (stdin)
  sl<size>      Process files with size less than specified
  sm<size>      Process files with size more than specified
  t             Test files after archiving
  ta[mcao]<d>   Process files modified after <d> YYYYMMDDHHMMSS date
  tb[mcao]<d>   Process files modified before <d> YYYYMMDDHHMMSS date
  tk            Keep original archive time
  tl            Set archive time to latest file
  tn[mcao]<t>   Process files newer than <t> time
  to[mcao]<t>   Process files older than <t> time
  ts[m,c,a,p]   Save or restore time (modification, creation, access, preserve)
  u             Update files
  v<size>[k,b]  Create volumes with size=<size>*1000 [*1024, *1]
  vd            Erase disk contents before creating volume
  ver[n]        File version control
  vn            Use the old style volume naming scheme
  vp            Pause before each volume
  w<path>       Assign work directory
  x<file>       Exclude specified file
  x@            Read file names to exclude from stdin
  x@<list>      Exclude files listed in specified list file
  y             Assume Yes on all queries
  z[file]       Read archive comment from file
  */

  // zlib.deflateSyncIntoRar {{{
  /**
   * @typedef {object} typeDeflateRarOption
   * @property {string} [dirWinRar=DEF_DIR_WINRAR] - A custom directory path of WinRAR.
   * @property {boolean} [isGUI=false] - true:WinRar.exe false:Rar.exe
   * @property {boolean} [workingDir] - Assign a working directory. RAR option: "-w<p>"
   * @property {string} [updateMode="add"] - "add" (-u -o+), "sync" (-u -as -o+), "mirror"
   * @property {boolean} [skipsExisting=false] - Skip existing contents
   * @property {string[]|string} [excludingFiles] - Exclude specified file
   * @property {boolean} [excludesUsingFiles=false] - Open shared files. RAR option: "-dh"
   * @property {boolean} [excludesEmptyDir=false] - Do not add empty directories. RAR option: "-ed"
   * @property {boolean} [excludesSubDirWildcard=false] - Recurse subdirectories for wildcard names only. RAR option: "-r0"
   * @property {boolean} [expandsPathsToFull=false] - true: Expand paths to full (-ep2). false (default): Exclude base directory from names (ep1)
   * @property {number} [compressLv=5] - Set compression level (0-store...3-default...5-maximal). RAR option: "-m<0..5>"
   * @property {number} [cpuPriority=0] - Set processing priority (0-default,1-min..15-max) and sleep time in ms
   * @property {number} [recoveryPer=3] - Add data recovery record
   * @property {string} [password] - Encrypt both file data and headers. RAR option: "-hp[password]"
   * @property {string} [dateCode] - If specify "yyyy-MM-dd" to Rar file name is <name>_yyyy-MM-dd.rar
   * @property {boolean} [excludesADS=false] - Do not save NTFS streams. (ADS: NTFS Alternate Data Stream. RAR option: "-os"
   * @property {boolean} [containsSecArea=false] - Save or restore file owner and group. RAR option: "-ow"
   * @property {boolean} [isSolidArchive=true] - Create solid archive
   * @property {boolean} [assumesYes=true] - Assume Yes on all queries
   * @property {boolean} [sendAllMesToStdErr=false] - Send all messages to stderr. RAR option: "-ierr"
   * @property {number} [rarVersion=5] - Specify a version of archiving format. RAR option: "-ma5"
   * @property {boolean} [isSymlinkAsLink=false] - Process symbolic links as the link(RAR 4.x以上、Linuxのみ？) RAR option: "-ol"
   * @property {boolean} [savesTmpList=false] - Does not remove temporary file list.
   * @property {boolean} [outputsLog=false] - Output console logs.
   * @property {boolean} [isDryRun=false] - No execute, returns the string of command.
   */

  /**
   * Compresses and encrypts files into RAR.
   *
   * @example
   * var zlib = Wsh.ZLIB; // Shorthand
   * var path = Wsh.Path;
   *
   * var dirWinRar = path.join(__dirname, '.\\bin\\WinRar');
   *
   * // Archiving a directory as a Rar file
   * var rtn = zlib.deflateSyncIntoRar('C:\\My Data', 'D:\\Backup.rar', {
   *   dirWinRar: dirWinRar
   * });
   *
   * console.dir(rtn);
   * // Outputs:
   * // { command: "C:\My Script\bin\WinRAR\Rar.exe" a -u -o+ -r0 -dh -ep1 -m3 -ma5 -os -s -y "D:\Backup.rar" @"C:\Users\Your Name\AppData\Local\Temp\fs-writeTmpFileSync_radB5E4E.tmp"",
   * //   exitCode: 0,
   * //   stdout: "
   * // RAR 6.11 x64   Copyright (c) 1993-2022 Alexander Roshal   3 Mar 2022
   * // ...
   * // ..
   * // Done
   * // ",
   * //   stderr: "",
   * //   error: false,
   * //   archivedPath: "D:\\Backup.rar" }
   *
   * // With many options
   * var rtn = zlib.deflateSyncIntoRar('C:\\My Data\\*.txt', 'D:\\Backup.rar', {
   *   dateCode: 'yyyyMMdd-HHmmss',
   *   compressLv: 0,
   *   password: 'This is mY&p@ss ^_<',
   *   excludingFiles: ['*utf16*', 'settings.json'],
   *   excludesEmptyDir: true,
   *   excludesSubDirWildcard: true,
   *   isGUI: true,
   *   dirWinRar: dirWinRar
   * });
   *
   * console.dir(rtn);
   * // Outputs:
   * // { command: "C:\My Script\bin\WinRAR\WinRar.exe" a -u -o+ -x@"C:\Users\<Your Name>\AppData\Local\Temp\fs-writeTmpFileSync_rad017F1.tmp" -dh -ed -ep1 -m0 -hp"This is mY&p@ss ^_<" -ma5 -os -s -y "D:\Backup_20220722-103741.rar" @"C:\Users\<Your Name>\AppData\Local\Temp\fs-writeTmpFileSync_rad89C8F.tmp",
   * //  exitCode: 0,
   * //  stdout: "",
   * //  stderr: "",
   * //  error: false,
   * //  archivedPath: "D:\Backup_20220722-103741.rar" }
   * @function deflateSyncIntoRar
   * @memberof Wsh.ZLIB
   * @param {string[]|string} paths - The compressed file paths. If a directory is specified, all of them are compressed, including sub directories. If you use a wildcard to specify the paths, you can use the R option to control the files contained in the sub directories.
   * @param {string} [dest] - The filepath or directory of destination ZIP.
   * @param {typeDeflateRarOption} [options] - Optional parameters.
   * @returns {typeDeflateResult|string} - @see typeDeflateResult. If options.isDryRun is true, returns string.
   */
  zlib.deflateSyncIntoRar = function (paths, dest, options) {
    var FN = 'zlib.deflateSyncIntoRar';

    if (!isSolidArray(paths) && !isSolidString(paths)) {
      throwErrInvalidValue(FN, 'paths', paths);
    }

    var outputsLog = obtain(options, 'outputsLog', false);
    var isDryRun = obtain(options, 'isDryRun', false);

    // Setting the arguments
    var args = [];

    // Setting the command
    _log(outputsLog, 'a: Add files to archive');
    args.push('a');

    // Assign work directory.
    var workingDir = obtain(options, 'workingDir', null);
    if (isSolidString(workingDir)) {
      _log(outputsLog, '-w: Assign work directory to "' + options.workingDir + '"');
      args.push('-w"' + options.workingDir + '"');
    }

    // Setting the mode of existing archive updating
    var updateMode = obtain(options, 'updateMode', 'ADD');
    if (isSameStr(updateMode, 'MIRROR')) {
      // No add switches
    } else {
      _log(outputsLog, '-u: Update a existing RAR file');
      args.push('-u');

      if (isSameStr(updateMode, 'SYNC')) {
        _log(outputsLog, '-as: Synchronize archive contents');
        args.push('-as');
      }

      if (isTrueLike(obtain(options, 'skipsExisting', false))) {
        _log(outputsLog, '-o-: Set the none of overwriting. (Skip existing)');
        args.push('-o-');
      } else {
        _log(outputsLog, '-o+: Set the overwriting (If existing updated, overwrite)');
        args.push('-o+');
      }
    }

    /**
     * Recurse subdirectories. "-r", "-r0"
     * -r and "C:\hoge\foo.exe" -> Targets all foo.exe in all sub folders.
     * -r0 and "C:\hoge\foo.exe" -> Targets only "C:\hoge\foo.exe"
     * -r0 and "C:\hoge\*\foo.exe" -> Targets all foo.exe in all sub folder.
     */
    var excludesSubDirWildcard = obtain(options, 'excludesSubDirWildcard', false);
    if (excludesSubDirWildcard) {
      _log(outputsLog, 'Exclude subdirectories (for wildcard names only)');
    } else {
      _log(outputsLog, '-r0: Recurse subdirectories (for wildcard names only)');
      args.push('-r0');
    }

    // Setting excluding files
    var excludingFiles = obtain(options, 'excludingFiles', null);
    var excludeListFile;

    if (isSolidArray(excludingFiles) || isSolidString(excludingFiles)) {
      var exNames;
      if (isSolidArray(excludingFiles)) {
        exNames = excludingFiles;
      } else if (isSolidString(excludingFiles)) {
        exNames = [excludingFiles];
      }

      var exNamesFormatted = [];
      exNames.forEach(function (name) {
        if (path.isAbsolute(name)) {
          exNamesFormatted.push(name);
        } else if (startsWith(name, '*')) {
          exNamesFormatted.push(name);
        } else {
          exNamesFormatted.push(path.join('*', name));
        }
      });

      excludeListFile = zlib._createTmpListFile(exNamesFormatted);
      args.push('-x@"' + excludeListFile + '"');

      _log(outputsLog, '-x@: Set excluding filepaths ' + insp(exNamesFormatted));
      _log(outputsLog, 'Excluding list file: ' + excludeListFile);
    }

    // Setting handling of open shared files.
    var excludesUsingFiles = obtain(options, 'excludesUsingFiles', false);
    if (excludesUsingFiles) {
      _log(outputsLog, 'Exclude shared files');
    } else {
      _log(outputsLog, '-dh: Open shared files');
      args.push('-dh');
    }

    // Setting handling empty directories.
    var excludesEmptyDir = obtain(options, 'excludesEmptyDir', false);
    if (excludesEmptyDir) {
      _log(outputsLog, '-ed: Does not add empty directories');
      args.push('-ed');
    } else {
      _log(outputsLog, 'Add empty directories');
    }

    // Path
    var expandsPathsToFull = obtain(options, 'expandsPathsToFull', false);
    if (expandsPathsToFull) {
      _log(outputsLog, '-ep2: Expand paths to full');
      args.push('-ep2');
    } else {
      _log(outputsLog, '-ep1: Exclude base directory from names');
      args.push('-ep1');
    }

    // Setting compression level (0-store...3-default...5-maximal).
    var compressLv = parseInt(obtain(options, 'compressLv', 3), 10);

    if (compressLv < 0 || 5 < compressLv) {
      _log(outputsLog, '-m5: Set compression level to 5-maximal');
      args.push('-m5');
    } else {
      _log(outputsLog, '-m' + compressLv + ': Set compression level (0-store..3..5-max)');
      args.push('-m' + compressLv);
    }

    // Encrypt both file data and headers.
    var password = obtain(options, 'password', null);
    if (isSolidString(password)) {
      _log(outputsLog, '-hp"****": Encrypt both file data and headers');
      args.push('-hp"' + password + '"');
    }

    // Specify a Rar version of archiving format.
    var rarVer = parseInt(obtain(options, 'rarVersion', 5), 10);

    if (typeof rarVer !== 'undefined' && rarVer !== null && rarVer < 4) {
      /* RAR2.9 */
    } else if (rarVer === 4) {
      _log(outputsLog, '-ma4: Specify RAR4.x of archiving format');
      args.push('-ma4');
    } else {
      _log(outputsLog, '-ma5: Specify RAR5.0(default) of archiving format');
      args.push('-ma5');

      if (isTrueLike(obtain(options, 'isSymlinkAsLink', false))) {
        _log(outputsLog, '-ol: Process symbolic links as the link(only for RAR5.0');
        args.push('-ol');
      }
    }

    // Add data recovery record.
    var rrLv = parseInt(obtain(options, 'recoveryPer', 0), 10);

    if (rrLv === 0) {
      /* */
    } else if (0 < rrLv && rrLv <= 100) {
      _log(outputsLog, '-ri: Add data recovery record -> ' + rrLv + 'p');
      args.push('-rr' + rrLv + 'p');
    } else {
      _log(outputsLog, '-ri: Add data recovery record -> 3p');
      args.push('-rr3p');
    }

    // Setting priority (0-default,1-min..15-max) and sleep time in ms
    var lv = parseInt(obtain(options, 'cpuPriority', 0), 10);

    if (lv === 0) {
      /* */
    } else if (lv < 0 || 15 < lv) {
      lv = 0;
    } else {
      args.push('-ri' + lv);
    }

    _log(outputsLog, '-ri' + lv + ': Set priority (0-default,1-min..15-max)');

    // Setting whether save NTFS streams (Alternate Data Stream).
    var excludesADS = obtain(options, 'excludesADS', false);
    if (excludesADS) {
      _log(outputsLog, 'Does not save NTFS streams. (ADS: Alternate Data Stream');
    } else {
      _log(outputsLog, '-os: Save NTFS streams. (ADS: Alternate Data Stream');
      args.push('-os');
    }

    // Setting whether save or restore file owner and group (Security info)
    var containsSecArea = obtain(options, 'containsSecArea', false);
    if (containsSecArea) {
      _log(outputsLog, '-ow: Save or restore file owner and group');
      args.push('-ow');
    }

    // Setting whether create solid archive.
    var isSolidArchive = obtain(options, 'isSolidArchive', true);
    if (isSolidArchive) {
      _log(outputsLog, '-s: Create solid archive');
      args.push('-s');
    } else {
      _log(outputsLog, '-s-: Create none of solid archive');
      args.push('-s-');
    }

    // Assume Yes on all queries.
    var assumesYes = obtain(options, 'assumesYes', true);
    if (assumesYes) {
      _log(outputsLog, '-y: Assume Yes on all queries');
      args.push('-y');
    }

    // Setting whether send all messages to stderr.
    var sendAllMesToStdErr = obtain(options, 'sendAllMesToStdErr', false);
    if (sendAllMesToStdErr) {
      _log(outputsLog, '-ierr: Send all messages to stderr');
      args.push('-ierr');
    }

    // Setting the destination RAR file path
    var destRar = zlib._makeDestArchivePath('.rar', paths, dest);

    // Appends the current date string to an archive name.
    var dateCode = obtain(options, 'dateCode', null);
    if (isSolidString(dateCode)) {
      destRar = destRar.replace(/(\.rar)?$/i, '_' + parseDate(dateCode) + '$1');
    }

    var destRarDir = path.dirname(destRar);
    if (!fs.existsSync(destRarDir) && !isDryRun) fse.ensureDirSync(destRarDir);

    // Adding the dest Rar path and source paths.
    args.push(destRar);

    // Setting source file paths
    var srcListFile = zlib._createTmpListFile(paths);
    args.push('@"' + srcListFile + '"');

    _log(outputsLog, 'Set compressed filepaths ' + insp(paths));
    _log(outputsLog, 'Compressed list file: ' + excludeListFile);

    // Executing
    // WinRar.exe or Rar.exe (default:WinRar.exe
    var dirWinRar = obtain(options, 'dirWinRar', DEF_DIR_WINRAR);
    var isGUI = obtain(options, 'isGUI', false);

    var exeRar;
    if (isGUI) {
      exeRar = path.join(dirWinRar, EXENAME_WINRAR);
    } else {
      exeRar = path.join(dirWinRar, EXENAME_RAR);
    }

    var op = objAdd({ isDryRun: isDryRun }, options);

    _log(outputsLog, 'exe path: ' + exeRar);
    _log(outputsLog, 'arguments: ' + insp(args));
    _log(outputsLog, 'options: ' + insp(op));

    var rtn = execFileSync(exeRar, args, op);
    rtn.archivedPath = destRar; // provisional

    // Remove lists
    var savesTmpList = obtain(options, 'savesTmpList', false);
    if (!savesTmpList) {
      if (excludeListFile) fse.removeSync(excludeListFile);
      fse.removeSync(srcListFile);
    }

    // Setting the true archived file path
    if (rtn.stdout && includes(rtn.stdout, 'Creating solid archive ')) {
      rtn.archivedPath = rtn.stdout.match(/Creating solid archive (.+)\r\n/)[1];
    }

    _log(outputsLog, insp(rtn));
    if (isDryRun) return rtn; // rtn is {string}

    // Exit Code Handling
    // @NOTE The GUI app WinRar.exe always returns exitCode = 0?
    // RAR exits with a zero exitCode (0) in case of successful operation. The exit
    // exitCode of non-zero means the operation was cancelled due to an error:
    if (rtn.error) {
      throw new Error('Failed to deflate the files\n'
        + ' ' + insp(rtn)
        + '  at ' + FN + ' (' + MODULE_TITLE + ')');
    }

    // 0: SUCCESS
    if (rtn.exitCode === 0) {
      _log(outputsLog, '[SUCCESS] success.');
      rtn.error = false;
      return rtn;
    }

    // 1: WARNING          Non fatal error(s) occurred
    if (rtn.exitCode === 1) {
      _log(outputsLog, '[WARNING] Non fatal error(s) occurred.');
      rtn.error = false;
      return rtn;
    }

    // 2: FATAL ERROR      A fatal error occurred
    if (rtn.exitCode === 2) {
      throw new Error(
        '[FATAL ERROR] A fatal error occurred.\n'
        + ' ' + insp(rtn)
        + '  at ' + FN + ' (' + MODULE_TITLE + ')'
      );
    }

    // 3: CRC ERROR        A CRC error occurred when unpacking
    if (rtn.exitCode === 3) {
      throw new Error(
        '[CRC ERROR] A CRC error occurred when unpacking.\n'
        + ' ' + insp(rtn)
        + '  at ' + FN + ' (' + MODULE_TITLE + ')'
      );
    }

    // 4: LOCKED ARCHIVE   Attempt to modify an archive previously locked
    if (rtn.exitCode === 4) {
      throw new Error(
        '[LOCKED ARCHIVE] Attempt to modify an archive previously locked by the ‘k’ command.\n'
        + ' ' + insp(rtn)
        + '  at ' + FN + ' (' + MODULE_TITLE + ')'
      );
    }

    // 5: WRITE ERROR      Write to disk error
    if (rtn.exitCode === 5) {
      throw new Error(
        '[WRITE ERROR] Write to disk error.\n'
        + ' ' + insp(rtn)
        + '  at ' + FN + ' (' + MODULE_TITLE + ')'
      );
    }

    // 6: OPEN ERROR       Open file error
    if (rtn.exitCode === 6) {
      throw new Error(
        '[OPEN ERROR] Open file error.\n'
        + ' ' + insp(rtn)
        + '  at ' + FN + ' (' + MODULE_TITLE + ')'
      );
    }

    // 7: USER ERROR       Command line option error
    if (rtn.exitCode === 7) {
      throw new Error(
        '[USER ERROR] Command line option error.\n'
        + ' ' + insp(rtn)
        + '  at ' + FN + ' (' + MODULE_TITLE + ')'
      );
    }

    // 8: MEMORY ERROR     Not enough memory for operation
    if (rtn.exitCode === 8) {
      throw new Error(
        '[MEMORY ERROR] Not enough memory for operation.\n'
        + ' ' + insp(rtn)
        + '  at ' + FN + ' (' + MODULE_TITLE + ')'
      );
    }

    // 9: CREATE ERROR     Create file error
    if (rtn.exitCode === 9) {
      throw new Error(
        '[CREATE ERROR] Create file error.\n'
        + ' ' + rtn.stderr
        + '  at ' + FN + ' (' + MODULE_TITLE + ')'
      );
    }

    // 10: SAME ARCHIVE
    if (rtn.exitCode === 10) {
      throw new Error(
        '[SAME ARCHIVE] No updating file. The existing RAR file is not changed'
        + ' ' + rtn.stderr
        + '  at ' + FN + ' (' + MODULE_TITLE + ')'
      );
    }

    // 255: USER BREAK       User stopped the process
    if (rtn.exitCode === 255) {
      throw new Error(
        '[USER BREAK] User stopped the process.\n'
        + ' ' + rtn.stderr
        + '  at ' + FN + ' (' + MODULE_TITLE + ')'
      );
    }

    throw new Error(
      '[UNKNOWN EXIT CODE] The compressing process probably failed\n'
      + ' ' + rtn.stderr
      + '  at ' + FN + ' (' + MODULE_TITLE + ')'
    );
  }; // }}}

  // zlib.testRarSync {{{
  /**
   * Test RAR file
   *
   * @function testRarSync
   * @memberof Wsh.ZLIB
   * @param {string} archive - The archive file path to open.
   * @param {object} [options] - Optional parameters.
   * @param {string} [options.dirWinRar=DEF_DIR_WINRAR] - A custom directory path of WinRAR.
   * @param {boolean} [options.isGUI=false] - true:WinRar.exe false:Rar.exe
   * @param {boolean} [options.outputsLog=false] - Output console logs.
   * @returns {object|string} - See {@link https://docs.tuckn.net/WshChildProcess/global.html#typeRunSyncReturn|typeRunSyncReturn}. If options.isDryRun is true, returns string.
   */
  zlib.testRarSync = function (archive, options) {
    var FN = 'zlib.testRarSync';

    if (!isSolidString(archive)) throwErrNonStr(FN, archive);

    var outputsLog = obtain(options, 'outputsLog', false);
    var isDryRun = obtain(options, 'isDryRun', false);
    var filePath = path.resolve(archive);

    // Set arguments
    var args = ['t', filePath];

    // Executing
    // WinRar.exe or Rar.exe (default:WinRar.exe
    var dirWinRar = obtain(options, 'dirWinRar', DEF_DIR_WINRAR);
    var isGUI = obtain(options, 'isGUI', false);

    var exeRar;
    if (isGUI) {
      exeRar = path.join(dirWinRar, EXENAME_WINRAR);
    } else {
      exeRar = path.join(dirWinRar, EXENAME_RAR);
    }

    var op = objAdd({ isDryRun: isDryRun }, options);

    _log(outputsLog, 'exe path: ' + exeRar);
    _log(outputsLog, 'arguments: ' + insp(args));
    _log(outputsLog, 'options: ' + insp(op));

    var rtn = execFileSync(exeRar, args, op);

    _log(outputsLog, insp(rtn));
    if (isDryRun) return rtn; // rtn is {string}

    // Exit values
    // RAR exits with a zero exitCode (0) in case of successful operation.
    // Non-zero exit exitCode indicates some kind of error:
    if (rtn.error) {
      throw new Error('Failed to test the files\n'
        + ' ' + insp(rtn)
        + '  at ' + FN + ' (' + MODULE_TITLE + ')');
    }

    // 0: Successful operation.
    if (rtn.exitCode === 0) {
      _log(outputsLog, 'Successful operation.');
      rtn.error = false;
      return rtn;
    }

    // 1: Non fatal error(s) occurred.
    if (rtn.exitCode === 1) {
      _log(outputsLog, 'Non fatal error(s) occurred.');
      rtn.error = false;
      return rtn;
    }

    // 2: A fatal error occurred.
    if (rtn.exitCode === 2) {
      throw new Error(
        'A fatal error occurred.'
        + ' ' + insp(rtn)
        + '  at ' + FN + ' (' + MODULE_TITLE + ')'
      );
    }

    // 3: Invalid checksum. Data is damaged.
    if (rtn.exitCode === 3) {
      throw new Error(
        'Invalid checksum. Data is damaged.'
        + ' ' + insp(rtn)
        + '  at ' + FN + ' (' + MODULE_TITLE + ')'
      );
    }

    // 4: Attempt to modify an archive locked by 'k' command.
    if (rtn.exitCode === 4) {
      throw new Error(
        ''
        + ' ' + insp(rtn)
        + '  at ' + FN + ' (' + MODULE_TITLE + ')'
      );
    }

    // 5: Write error.
    if (rtn.exitCode === 5) {
      throw new Error(
        '[WRITE ERROR] Write to disk error.\n'
        + ' ' + insp(rtn)
        + '  at ' + FN + ' (' + MODULE_TITLE + ')'
      );
    }

    // 6: File open error.
    if (rtn.exitCode === 6) {
      throw new Error(
        '[OPEN ERROR] Open file error.\n'
        + ' ' + insp(rtn)
        + '  at ' + FN + ' (' + MODULE_TITLE + ')'
      );
    }

    // 7: Wrong command line option.
    if (rtn.exitCode === 7) {
      throw new Error(
        '[USER ERROR] Command line option error.\n'
        + ' ' + insp(rtn)
        + '  at ' + FN + ' (' + MODULE_TITLE + ')'
      );
    }

    // 8: Not enough memory.
    if (rtn.exitCode === 8) {
      throw new Error(
        '[MEMORY ERROR] Not enough memory for operation.\n'
        + ' ' + insp(rtn)
        + '  at ' + FN + ' (' + MODULE_TITLE + ')'
      );
    }

    // 9: File create error
    if (rtn.exitCode === 9) {
      throw new Error(
        '[CREATE ERROR] Create file error.\n'
        + ' ' + insp(rtn)
        + '  at ' + FN + ' (' + MODULE_TITLE + ')'
      );
    }

    // 10: No files matching the specified mask and options were found.
    if (rtn.exitCode === 10) {
      throw new Error(
        'No files matching the specified mask and options were found.\n'
        + ' ' + insp(rtn)
        + '  at ' + FN + ' (' + MODULE_TITLE + ')'
      );
    }

    // 11: Wrong password.
    if (rtn.exitCode === 11) {
      throw new Error(
        'Wrong password.'
        + ' ' + insp(rtn)
        + '  at ' + FN + ' (' + MODULE_TITLE + ')'
      );
    }

    // 255: User stopped the process.
    if (rtn.exitCode === 255) {
      throw new Error(
        '[USER BREAK] User stopped the process.\n'
        + ' ' + insp(rtn)
        + '  at ' + FN + ' (' + MODULE_TITLE + ')'
      );
    }

    throw new Error(
      '[UNKNOWN EXIT CODE] The testing process probably failed\n'
      + ' ' + insp(rtn)
      + '  at ' + FN + ' (' + MODULE_TITLE + ')'
    );
  }; // }}}

  // zlib.openRar {{{
  /**
   * Opens the RAR file.
   *
   * @example
   * var zlib = Wsh.ZLIB; // Shorthand
   * var path = Wsh.Path;
   * var dirWinRar = path.join(__dirname, '.\\bin\\WinRar');
   *
   * zlib.openRar('D:\\Backup.rar', { dirWinRar: dirWinRar });
   * @function openRar
   * @memberof Wsh.ZLIB
   * @param {string} archive - An archive filepath
   * @param {object} [options] - Optional parameters.
   * @param {string} [options.dirWinRar=DEF_DIR_WINRAR] - A custom directory path of WinRAR.
   * @param {string} [options.winStyle='activeDef']
   * @returns {void}
   */
  zlib.openRar = function (archive, options) {
    var FN = 'zlib.openRar';

    if (!isSolidString(archive)) throwErrNonStr(FN, archive);

    var filePath = path.resolve(archive);

    // Setting the .exe path
    // WinRar.exe or Rar.exe (default:WinRar.exe
    var dirWinRar = obtain(options, 'dirWinRar', DEF_DIR_WINRAR);
    var exeRar = path.join(dirWinRar, EXENAME_WINRAR);

    var winStyle = obtain(options, 'winStyle', CD.windowStyles.activeDef);
    var op = objAdd({ shell: false, winStyle: winStyle }, options);
    var command = srrd(exeRar) + ' ' + srrd(filePath);

    // Executing
    exec(command, op);
  }; // }}}

  // zlib.unrarSync {{{
  /**
   * Extracts files from archiver with Rar.
   *
   * @example
   * var zlib = Wsh.ZLIB; // Shorthand
   * var path = Wsh.Path;
   * var dirWinRar = path.join(__dirname, '.\\bin\\WinRar');
   *
   * var rtn = zlib.unrarSync('D:\\Backup.rar', 'C:\\Temp', {
   *   makesArchiveNameDir: true,
   *   dirWinRar: dirWinRar;
   * });
   * @function unrarSync
   * @memberof Wsh.ZLIB
   * @param {string} archive An archive file path
   * @param {string} [destDir] A output directory path.
   * @param {object} [options] - Optional parameters.
   * @param {string} [options.dirWinRar=DEF_DIR_WINRAR] - A custom directory path of WinRAR.
   * @param {boolean} [options.isGUI=true] - true:WinRar.exe false:Rar.exe
   * @param {string} [options.password]
   * @param {boolean} [options.makesArchiveNameDir=false] Make a new directory with archive file name
   * @param {boolean} [options.outputsLog=false] - Output console logs.
   * @param {boolean} [options.isDryRun=false] - No execute, returns the string of command.
   * @returns {object} - See {@link https://docs.tuckn.net/WshChildProcess/global.html#typeRunSyncReturn|typeRunSyncReturn}.
   */
  zlib.unrarSync = function (archive, destDir, options) {
    var FN = 'zlib.unrarSync';

    if (!isSolidString(archive)) throwErrNonStr(FN, archive);

    var outputsLog = obtain(options, 'outputsLog', false);
    var isDryRun = obtain(options, 'isDryRun', false);

    // Setting the arguments
    _log(outputsLog, 'x: eXtract files with full paths');
    var args = ['x'];

    // Setting the UnRar password
    var password = obtain(options, 'password', null);
    if (!isEmpty(password)) {
      _log(outputsLog, '-p"****": Set the password');
      args.push('-p"' + password + '"');
    }

    // Assign work directory.
    var workingDir = obtain(options, 'workingDir', null);
    if (isSolidString(workingDir)) {
      _log(outputsLog, '-w: Assign work directory to "' + options.workingDir + '"');
      args.push('-w"' + options.workingDir + '"');
    }

    var srcPath = path.resolve(archive);

    // Setting the output directory path.
    // If it is not specified, set the srcPath directory.
    if (isEmpty(destDir)) destDir = path.dirname(srcPath);

    destDir = path.resolve(destDir);

    // Creating the output directory
    if (!fs.existsSync(destDir) && obtain(options, 'makesDestDir', false)) {
      _log(outputsLog, 'Creating the dest directory');
      if (!isDryRun) fse.ensureDirSync(destDir);
    }

    if (obtain(options, 'makesArchiveNameDir', false)) {
      destDir = path.join(destDir, path.parse(srcPath).name);
      _log(outputsLog, 'Creating the Zip name directory');
      if (!isDryRun) fse.ensureDirSync(destDir);
    }

    _log(outputsLog, 'Set output directory. "' + destDir + '"');

    // Combine
    args.push('-y', '-ri0', srcPath, destDir);

    // Executing
    // WinRar.exe or Rar.exe (default:WinRar.exe
    var dirWinRar = obtain(options, 'dirWinRar', DEF_DIR_WINRAR);
    var isGUI = obtain(options, 'isGUI', false);

    var exeRar;
    if (isGUI) {
      exeRar = path.join(dirWinRar, EXENAME_WINRAR);
    } else {
      exeRar = path.join(dirWinRar, EXENAME_RAR);
    }

    var op = objAdd({ isDryRun: isDryRun }, options);

    _log(outputsLog, 'exe path: ' + exeRar);
    _log(outputsLog, 'arguments: ' + insp(args));
    _log(outputsLog, 'options: ' + insp(op));

    var rtn = execFileSync(exeRar, args, op);
    rtn.destinationDir = destDir;

    if (isDryRun) return rtn; // rtn is {string}

    _log(outputsLog, insp(rtn));
    if (isDryRun) return rtn; // rtn is {string}

    // Exit Code Handling
    // @NOTE The GUI app WinRar.exe always returns exitCode = 0?
    // RAR exits with a zero exitCode (0) in case of successful operation.
    // Non-zero exit exitCode indicates some kind of error:
    if (rtn.error) {
      throw new Error('Failed to unRar the files\n'
        + ' ' + rtn.stderr
        + '  at ' + FN + ' (' + MODULE_TITLE + ')');
    }

    // 0: Successful operation.
    if (rtn.exitCode === 0) {
      _log(outputsLog, '[SUCCESS] Successful operation.');
      rtn.error = false;
      return rtn;
    }

    // 1: Non fatal error(s) occurred.
    if (rtn.exitCode === 1) {
      _log(outputsLog, 'Non fatal error(s) occurred.');
      rtn.error = false;
      return rtn;
    }

    // 2: A fatal error occurred.
    if (rtn.exitCode === 2) {
      throw new Error(
        '[FATAL ERROR] A fatal error occurred.\n'
        + ' ' + insp(rtn)
        + '  at ' + FN + ' (' + MODULE_TITLE + ')'
      );
    }

    // 3: Invalid checksum. Data is damaged.
    if (rtn.exitCode === 3) {
      throw new Error(
        'Invalid checksum. Data is damaged.'
        + ' ' + insp(rtn)
        + '  at ' + FN + ' (' + MODULE_TITLE + ')'
      );
    }

    // 4: Attempt to modify an archive locked by 'k' command.
    if (rtn.exitCode === 4) {
      throw new Error(
        ''
        + ' ' + insp(rtn)
        + '  at ' + FN + ' (' + MODULE_TITLE + ')'
      );
    }

    // 5: Write error.
    if (rtn.exitCode === 5) {
      throw new Error(
        '[WRITE ERROR] Write to disk error.\n'
        + ' ' + insp(rtn)
        + '  at ' + FN + ' (' + MODULE_TITLE + ')'
      );
    }

    // 6: File open error.
    if (rtn.exitCode === 6) {
      throw new Error(
        '[OPEN ERROR] Open file error.\n'
        + ' ' + insp(rtn)
        + '  at ' + FN + ' (' + MODULE_TITLE + ')'
      );
    }

    // 7: Wrong command line option.
    if (rtn.exitCode === 7) {
      throw new Error(
        '[USER ERROR] Wrong command line option.\n'
        + ' ' + insp(rtn)
        + '  at ' + FN + ' (' + MODULE_TITLE + ')'
      );
    }

    // 8: Not enough memory.
    if (rtn.exitCode === 8) {
      throw new Error(
        '[MEMORY ERROR] Not enough memory for operation.\n'
        + ' ' + insp(rtn)
        + '  at ' + FN + ' (' + MODULE_TITLE + ')'
      );
    }

    // 9: File create error
    if (rtn.exitCode === 9) {
      throw new Error(
        '[CREATE ERROR] Create file error.\n'
        + ' ' + insp(rtn)
        + '  at ' + FN + ' (' + MODULE_TITLE + ')'
      );
    }

    // 10: No files matching the specified mask and options were found.
    if (rtn.exitCode === 10) {
      throw new Error(
        'No files matching the specified mask and options were found.\n'
        + ' ' + insp(rtn)
        + '  at ' + FN + ' (' + MODULE_TITLE + ')'
      );
    }

    // 11: Wrong password.
    if (rtn.exitCode === 11) {
      throw new Error(
        'Wrong password.'
        + ' ' + insp(rtn)
        + '  at ' + FN + ' (' + MODULE_TITLE + ')'
      );
    }

    // 255: User stopped the process.
    if (rtn.exitCode === 255) {
      throw new Error(
        '[USER BREAK] User stopped the process.\n'
        + ' ' + insp(rtn)
        + '  at ' + FN + ' (' + MODULE_TITLE + ')'
      );
    }

    throw new Error(
      '[UNKNOWN EXIT CODE] The unRar process probably failed\n'
      + ' ' + insp(rtn)
      + '  at ' + FN + ' (' + MODULE_TITLE + ')'
    );
  }; // }}}
}());

// vim:set foldmethod=marker commentstring=//%s :
