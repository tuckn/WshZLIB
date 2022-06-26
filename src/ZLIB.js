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

  var obtain = util.obtainPropVal;
  var isEmpty = util.isEmpty;
  var isFalsy = util.isFalsy;
  var isTruthy = util.types.isTruthy;
  var isSolidArray = util.isSolidArray;
  var isSolidString = util.isSolidString;
  var isPureNumber = util.isPureNumber;
  var isSameStr = util.isSameMeaning;
  var insp = util.inspect;
  var includes = util.includes;
  var parseDate = util.createDateString;
  var execFile = child_process.execFile;
  var execFileSync = child_process.execFileSync;
  var execSync = child_process.execSync;

  var zlib = Wsh.ZLIB;

  /** @constant {string} */
  var MODULE_TITLE = 'WshZLIB/ZLIB.js';

  var DEF_DIR_7ZIP = 'C:\\Program Files\\7-Zip';
  var EXENAME_7Z = '7z.exe';

  /** @constant {string} */
  var DEF_7ZIP_EXE = path.join(DEF_DIR_7ZIP, EXENAME_7Z);

  /** @constant {string} */
  var EXENAME_7ZFM = '7zFM.exe';

  /** @constant {string} */
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
   * Compresses and encrypts files into ZIP with 7-Zip.
   *
   * @function deflateSync
   * @memberof Wsh.ZLIB
   * @param {string[]|string} paths - The compressed file paths. If a directory is specified, all of them are compressed, including sub directories. If you use a wildcard to specify the paths, you can use the R option to control the files contained in the sub directories.
   * @param {string} [dest] - The filepath or directory of destination ZIP.
   * @param {object} [options] - Optional parameters.
   * @param {string} [options.exe7zip=DEF_7ZIP_EXE] - A custom .exe path of 7-ZIP.
   * @param {boolean} [options.includesSubDir=false] - Whether include sub directories when you specified wildcard or filename to `paths`.
   * @param {boolean} [options.updateMode='sync'] - A method of overwriting an existing dest Zip file. "sync" (default) or "add"
   * @param {string} [options.dateCode] - If specify "yyyy-MM-dd" to Zipfile name is <name>_yyyy-MM-dd.zip
   * @param {number|string} [options.compressLv=5] Level of compression. 1,3,5,7,9 or Fastest, Fast, Normal, Maximum, Ultra
   * @param {string[]|string} [options.excludePaths] - You should specify relative paths with a wildcard. Cannot establish absolute paths.
   * @param {string} [options.password] - Specifies password. File names will be not encrypted in Zip archive.
   * @param {string} [options.workingDir] - Working directory
   * @param {boolean} [options.outputsLog=false] - Output console logs.
   * @param {boolean} [options.savesTmpList=false] - Does not remove temporary file list.
   * @param {boolean} [options.isDryRun=false] - No execute, returns the string of command.
   * @returns {object|string} - See {@link https://docs.tuckn.net/WshChildProcess/global.html#typeRunSyncReturn|typeRunSyncReturn}. If options.isDryRun is true, returns string.
   */
  zlib.deflateSync = function (paths, dest, options) {
    var FN = 'zlib.deflateSync';

    if (!isSolidArray(paths) && !isSolidString(paths)) {
      throwErrInvalidValue(FN, 'paths', paths);
    }

    var outputsLog = obtain(options, 'outputsLog', false);
    var isDryRun = obtain(options, 'isDryRun', false);

    // Setting core arguments
    if (outputsLog) {
      // console.log('a: Add files to archive');
      console.log('u : Update files to archive');
      console.log('-tzip: Set ZIP type of archive');
      console.log('-ssw: Compress shared(locked) files');
    }
    var argsStr = 'u -tzip -ssw';

    // Setting Recurse switch
    var includesSubDir = obtain(options, 'includesSubDir', false);
    var rc = '';

    if (includesSubDir) {
      if (outputsLog) console.log('-r: Include subdirectories (When specified wildcard or filename)');
      argsStr += ' -r';
      rc = 'r';
    } else {
      if (outputsLog) console.log('-r-: Not include subdirectories (When specified wildcard or filename)');
      argsStr += ' -r-';
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

      if (outputsLog) console.log(mxN + ': Set compression level (-mx1(fastest) ... -mx9(ultra)');

      argsStr += ' ' + mxN;
    }

    // Setting a zip password (-p{Password})
    // @note File names will be not encrypted in Zip archive.
    // Encode an archive header option, -mhe=on can be used by .7z only!
    var password = obtain(options, 'password', null);
    if (!isEmpty(password)) {
      if (outputsLog) console.log('-p"****": Set the password (-mem=AES256)');
      argsStr += ' -p"' + password + '" -mem=AES256';
    }

    // Assign the working directory (-w[{path}])
    var workingDir = obtain(options, 'workingDir', null);
    if (!isEmpty(workingDir)) {
      if (outputsLog) {
        console.log('-w"' + workingDir + '": Assign the working directory');
      }
      argsStr += ' -w"' + workingDir + '"';
    }

    // Setting excluding filepaths (-x)
    var excludePaths = obtain(options, 'excludePaths', null);
    var excludeListFile;

    if (!isEmpty(excludePaths)) {
      excludeListFile = zlib._createTmpListFile(excludePaths);
      argsStr += ' -x' + rc + '@"' + excludeListFile + '"';

      if (outputsLog) {
        console.log('-x: Set excluding filepaths ' + insp(excludePaths));
        console.log('Excluding list file: ' + excludeListFile);
      }
    }

    // Setting the destination ZIP file path
    var destZip = dest;
    var srcPath1 = isSolidArray(paths) ? paths[0] : paths;

    if (isEmpty(destZip)) {
      if (fs.existsSync(srcPath1) && fs.statSync(srcPath1).isDirectory()) {
        destZip = srcPath1 + '.zip';
      } else if (/\\\*$/.test(srcPath1)) {
        destZip = path.dirname(srcPath1).replace(/\\\*$/, '') + '.zip';
      } else {
        destZip = srcPath1.replace(/\*/g, 'xxx') + '.zip';
      }
    } else if (fs.existsSync(destZip) && fs.statSync(destZip).isDirectory()) {
      // When specified the dest and it's a existing directory,
      if (fs.existsSync(srcPath1) && fs.statSync(srcPath1).isDirectory()) {
        destZip = path.join(destZip, path.basename(srcPath1) + '.zip');
      } else {
        destZip = path.join(
          destZip,
          path.basename(srcPath1).replace(/\*/g, 'xxx') + '.zip'
        );
      }
    }

    // Appends the current date string to an archive name.
    var dateCode = obtain(options, 'dateCode', null);
    if (isSolidString(dateCode)) {
      destZip = destZip.replace(/(\.zip)?$/i, '_' + parseDate(dateCode) + '$1');
    }

    // Setting the updating method and adding the dest path to args.
    var updateMode = obtain(options, 'updateMode', 'SYNC');
    if (fs.existsSync(destZip)) {
      if (isSameStr(updateMode, 'SYNC')) {
        argsStr += ' -up0q0r2x1y1z1w2';
      }
    }

    // Adding the dest zip path and source paths.
    argsStr += ' "' + destZip + '"';

    // Setting source file paths
    var srcListFile = zlib._createTmpListFile(paths);
    argsStr += ' ' + '@"' + srcListFile + '"';

    if (outputsLog) {
      console.log('Set compressed filepaths ' + insp(paths));
      console.log('Compressed list file: ' + excludeListFile);
    }

    // Executing
    // Setting the .exe path
    var exe7z = obtain(options, 'exe7zip', DEF_7ZIP_EXE);
    var cmd = '"' + exe7z + '" ' + argsStr;

    if (outputsLog) {
      console.log('exe path: ' + exe7z);
      console.log('arguments: ' + argsStr);
      console.log('command: ' + cmd);
    }

    var rtn = execSync(cmd, {
      winStyle: CD.windowStyles.hidden,
      isDryRun: isDryRun
    });

    // Remove lists
    var savesTmpList = obtain(options, 'savesTmpList', false);
    if (!savesTmpList) {
      if (excludeListFile) fse.removeSync(excludeListFile);
      fse.removeSync(srcListFile);
    }

    if (isDryRun) return rtn; // rtn is {string}

    if (outputsLog) console.log(insp(rtn));

    // Exit values
    if (rtn.error) {
      throw new Error('Failed to deflate the files\n'
        + ' ' + rtn.stderr
        + '  at ' + FN + ' (' + MODULE_TITLE + ')');
    }

    // @TODO execSync can not receive exitCode... But execFileSync can not get stdout, now.

    if (includes(rtn.stdout, 'Everything is Ok')) {
      if (outputsLog) console.log('No error');
      return rtn;
    }

    throw new Error(
      'The compressing process is failed\n'
      + ' ' + rtn.stderr
      + '  at ' + FN + ' (' + MODULE_TITLE + ')'
    );

    /* Exit Code Handling
    // 0: No error
    if (rtn.exitCode === 0) {
      if (outputsLog) console.log('No error');
      rtn.error = false;
      return rtn;
    }

    // 1: Warning (Non fatal error(s)).
    //   For example, one or more files were locked by some other application,
    //   so they were not compressed.
    if (rtn.exitCode === 1) {
      if (outputsLog) console.log('Warning. Non fatal error(s).');
      rtn.error = false;
      return rtn;
    }

    // 2: Fatal Error
    if (rtn.exitCode === 2) {
      throw new Error(
        '[ERROR] 7-Zip: Fatal Error\n'
        + ' ' + rtn.stderr
        + '  at ' + FN + ' (' + MODULE_TITLE + ')'
      );
    }

    // 7: Command line error
    if (rtn.exitCode === 7) {
      throw new Error(
        '[ERROR] 7-Zip: Command line error\n'
        + ' ' + rtn.stderr
        + '  at ' + FN + ' (' + MODULE_TITLE + ')'
      );
    }

    // 8: Not enough memory for operation
    if (rtn.exitCode === 8) {
      throw new Error(
        '[ERROR] 7-Zip: Not enough memory for operation\n'
        + ' ' + rtn.stderr
        + '  at ' + FN + ' (' + MODULE_TITLE + ')'
      );
    }

    // 255: User stopped the process
    if (rtn.exitCode === 255) {
      throw new Error(
        '[ERROR] 7-Zip: User stopped the process\n'
        + ' ' + rtn.stderr
        + '  at ' + FN + ' (' + MODULE_TITLE + ')'
      );
    }

    throw new Error(
      '[UNKNOWN EXIT CODE] The compressing process probably failed\n'
      + ' ' + rtn.stderr
      + '  at ' + FN + ' (' + MODULE_TITLE + ')'
    );
    */

    // // @TODO 退避させた同名ファイルの処理
    // if (fs.statSync(newZipPath + '.tmp').isFile()) {
    //   if (assoc.error) { // エラーなら元に戻す
    //     fso.MoveFile(newZipPath + '.tmp', newZipPath);
    //   } else {
    //     fs.unlinkSync(newZipPath + '.tmp');
    //   }
    // }
  }; // }}}

  // zlib.openZip {{{
  /**
   * Open the archive file with 7-Zip.
   *
   * @function openZip
   * @memberof Wsh.ZLIB
   * @param {string} archive - A archive filepath
   * @param {object} [options] - Optional parameters.
   * @param {string} [options.dir7zip=DEF_DIR_7ZIP] - A custom directory path of 7-ZIP.
   * @param {string} [options.winStyle='activeDef']
   * @returns {void}
   */
  zlib.openZip = function (archive, options) {
    var FN = 'zlib.openZip';

    if (!isSolidString(archive)) throwErrNonStr(FN, archive);

    var filePath = path.resolve(archive);

    // Setting the .exe path
    var dir7zip = obtain(options, 'dir7zip', DEF_DIR_7ZIP);
    var exe7zFM = path.join(dir7zip, EXENAME_7ZFM);

    // Executing
    var winStyle = obtain(options, 'winStyle', CD.windowStyles.activeDef);
    execFile(exe7zFM, [filePath], { winStyle: winStyle });
  }; // }}}

  // zlib.unzipSync {{{
  /**
   * @description Extract files from archiver with 7-Zip.
   *
   * @function unzipSync
   * @memberof Wsh.ZLIB
   * @param {string} archive - The archive file path
   * @param {string} [destDir] - The output directory path.
   * @param {object} [options] - Optional parameters.
   * @param {string} [options.dir7zip=DEF_DIR_7ZIP] - A custom directory path of 7-ZIP.
   * @param {string} [options.password] - -p (set password)
   * @param {boolean} [options.makesDir=true] - Makes a new directory with archive file name
   * @param {boolean} [options.outputsLog=false] - Output console logs.
   * @returns {object} - See {@link https://docs.tuckn.net/WshChildProcess/global.html#typeRunSyncReturn|typeRunSyncReturn}.
   */
  zlib.unzipSync = function (archive, destDir, options) {
    var FN = 'zlib.unzipSync';

    if (!isSolidString(archive)) throwErrNonStr(FN, archive);

    var outputsLog = obtain(options, 'outputsLog', false);

    // Setting arguments
    if (outputsLog) console.log('x: eXtract files with full paths');
    var args = ['x'];

    // Setting the Unzip password
    var password = obtain(options, 'password', null);
    if (!isEmpty(password)) {
      if (outputsLog) console.log('-p"****": Set the password');
      args.push('-p"' + password + '"');
    }

    var srcPath = path.resolve(archive);

    // Setting the output directory path.
    // If it is not specified, set the srcPath directory.
    if (isEmpty(destDir)) destDir = path.dirname(srcPath);

    destDir = path.resolve(destDir);

    if (obtain(options, 'makesDir', true)) {
      destDir = path.join(destDir, path.parse(srcPath).name);
    }

    // Creating the destination directory
    if (!fs.existsSync(destDir)) fse.ensureDirSync(destDir);

    args.push(srcPath, '-o' + destDir, '-y');

    // Executing
    // Setting the .exe path
    var dir7zip = obtain(options, 'dir7zip', DEF_DIR_7ZIP);
    var exe7z = path.join(dir7zip, EXENAME_7Z);

    if (outputsLog) console.log('7zip path: ' + exe7z);
    if (outputsLog) console.log('arguments: ' + args.join(' '));

    var rtn = execFileSync(exe7z, args, { winStyle: CD.windowStyles.hidden });

    if (outputsLog) console.log(insp(rtn));

    // Exit values
    if (rtn.error) {
      throw new Error('Failed to unzip the files\n'
        + ' ' + rtn.stderr
        + '  at ' + FN + ' (' + MODULE_TITLE + ')');
    }

    // 0: No error
    if (rtn.exitCode === 0) {
      if (outputsLog) console.log('No error');
      rtn.error = false;
      return rtn;
    }

    // 1: Warning (Non fatal error(s)). For example, one or more files were
    //  locked by some other application, so they were not compressed.
    if (rtn.exitCode === 1) {
      if (outputsLog) console.log('Warning. Non fatal error(s).');
      rtn.error = false;
    }

    // 2: Fatal error.
    if (rtn.exitCode === 2) {
      throw new Error(
        '[ERROR] 7-Zip: Fatal Error\n'
        + ' ' + rtn.stderr
        + '  at ' + FN + ' (' + MODULE_TITLE + ')'
      );
    }

    // 3: Command line error.
    if (rtn.exitCode === 3) {
      throw new Error(
        '[ERROR] 7-Zip: Command line error\n'
        + ' ' + rtn.stderr
        + '  at ' + FN + ' (' + MODULE_TITLE + ')'
      );
    }

    // 5: Not enough memory for operation.
    if (rtn.exitCode === 5) {
      throw new Error(
        '[ERROR] 7-Zip: Not enough memory for operation\n'
        + ' ' + rtn.stderr
        + '  at ' + FN + ' (' + MODULE_TITLE + ')'
      );
    }

    // 255: User stopped the process.
    if (rtn.exitCode === 255) {
      throw new Error(
        '[ERROR] 7-Zip: User stopped the process\n'
        + ' ' + rtn.stderr
        + '  at ' + FN + ' (' + MODULE_TITLE + ')'
      );
    }

    if (outputsLog) console.log('UNKNOWN EXIT CODE');
    rtn.error = true;

    return rtn;
  }; // }}}

  /**
   * @description RAR
RAR 5.60 beta 5 x64   Copyright (c) 1993-2018 Alexander Roshal   17 Jun 2018 {{{
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
  ad            Append archive name to destination path
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
  en            Do not put 'end of archive' block
  ep            Exclude paths from names
  ep1           Exclude base directory from names
  ep2           Expand paths to full
  ep3           Expand paths to full including the drive letter
  f             Freshen files
  hp[password]  Encrypt both file data and headers
  ht[b|c]       Select hash type [BLAKE2,CRC32] for file checksum
  id[c,d,p,q]   Disable messages
  ieml[addr]    Send archive by email
  ierr          Send all messages to stderr
  ilog[name]    Log errors to file
  inul          Disable all messages
  ioff[n]       Turn PC off after completing an operation
  isnd          Enable sound
  iver          Display the version number
  k             Lock archive
  kb            Keep broken extracted files
  log[f][=name] Write names to log file
  m<0..5>       Set compression level (0-store...3-default...5-maximal)
  ma[4|5]       Specify a version of archiving format
  mc<par>       Set advanced compression parameters
  md<n>[k,m,g]  Dictionary size in KB, MB or GB
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
  or            Rename files automatically
  os            Save NTFS streams
  ow            Save or restore file owner and group
  p[password]   Set password
  p-            Do not query password
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
  ta<date>      Process files modified after <date> in YYYYMMDDHHMMSS format
  tb<date>      Process files modified before <date> in YYYYMMDDHHMMSS format
  tk            Keep original archive time
  tl            Set archive time to latest file
  tn<time>      Process files newer than <time>
  to<time>      Process files older than <time>
  ts[m|c|a]     Save or restore file time (modification, creation, access)
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
  z[file]       Read archive comment from file }}}
  */

  // zlib.deflateSyncIntoRar {{{
  /**
   * Compresses and encrypts files into RAR.
   *
   * @function deflateSyncIntoRar
   * @memberof Wsh.ZLIB
   * @param {string[]} paths - 圧縮対象。複数ある場合は配列にして渡す
   *   複数ある場合、リストファイルを作成し、@<lf> オプションで指定する
   * @param {string} [dest] - A dest RAR file path or a dest directory.
   * @param {object} [options] - Optional parameters.
   * @param {string} [options.dirWinRar=DEF_DIR_WINRAR] - A custom directory path of WinRAR.
   * @param {boolean} [options.isGUI=true] - true:WinRar.exe false:Rar.exe
   * @param {string} [options.dateCode] - If specify "yyyy-MM-dd" to Zipfile name is <name>_yyyy-MM-dd.zip
   * @param {string} [options.password] - ファイルヘッダも含めて暗号化
   * @param {number} [options.compressLv=5] - 圧縮率 "-m0:store ～ -m5:best"
   * @param {number} [options.cpuPriority=0] - 処理優先度(Default:0, MIN1-MAX15)
   * @param {number} [options.recoveryPer=3] - リカバレルコード3%
   * @param {number} [options.excludePaths] 圧縮除外。複数ある場合は配列にして渡す
   * @param {string} [option.updateMode="add"] "add"(-u -o+), "sync"(-u -as -o+), "mirror"
   * @param {boolean} [option.skipsExisting=false] - Skip existing contents
   * @param {boolean} [option.containsUsingFile=true] - 使用中ファイルも圧縮
   * @param {boolean} [option.containsADS=true] - Alternate Data Stream=NTFSストリームを格納
   * @param {boolean} [option.containsSecArea=true] - セキュリティ情報を保存
   * @param {boolean} [option.containsEmptyDir=true] - Do not add empty directories
   * @param {boolean} [option.recursesSubDir=true] - サブディレクトリを再帰的に圧縮
   * @param {boolean} [option.isSolidArchive=true] - ソリッド圧縮
   * @param {boolean} [option.assumesYes=true] - すべての質問に'はい'と答えます
   * @param {boolean} [option.expandPathsToFull=false] - false:"-ep1" 該当フォルダのみ格納 true:"-ep2" フルパスで格納。他にも -epと-ep3がある
   * @param {boolean} [option.sendAllMesToStdErr=true] - Send all messages to stderr. RAR option: "-ierr"
   * @param {number} [options.rarVersion=5] - Specify a version of archiving format. RAR option: "-ma5"
   * @param {boolean} [options.symlinkAsLink=false] - Process symbolic links as the link(RAR 4.x以上、Linuxのみ？) RAR option: "-ol"
   * @param {boolean} [options.workDir] - Assign work directory. RAR option: "-w<p>"
   * @param {boolean} [options.outputsLog=false] - Output console logs.
   * @returns {object|string} - See {@link https://docs.tuckn.net/WshChildProcess/global.html#typeRunSyncReturn|typeRunSyncReturn}. If options.isDryRun is true, returns string.
   */
  zlib.deflateSyncIntoRar = function (paths, dest, options) {
    var FN = 'zlib.deflateSyncIntoRar';

    if (!isSolidArray(paths)) throwErrInvalidValue(FN, 'paths', paths);

    var outputsLog = obtain(options, 'outputsLog', false);

    // Setting arguments
    if (outputsLog) console.log('a: Add files to archive');
    var args = ['a'];

    // Setting the mode of existing archive updating
    var updateMode = obtain(options, 'updateMode', 'ADD');
    if (isSameStr(updateMode, 'MIRROR')) {
      // No add switches
    } else {
      if (outputsLog) console.log('-u: Update a existing RAR file');
      args.push('-u');

      if (isSameStr(updateMode, 'SYNC')) {
        if (outputsLog) console.log('-as: Synchronize archive contents');
        args.push('-as');
      }

      if (isTruthy(obtain(options, 'skipsExisting', false))) {
        if (outputsLog) console.log('-o-: Set the none of overwriting. (Skip existings)');
        args.push('-o-');
      } else {
        if (outputsLog) console.log('-o+: Set the overwriting (If existing updated, overwrite)');
        args.push('-o+');
      }
    }

    // Setting handling of open shared files. default: true
    if (isTruthy(obtain(options, 'containsUsingFile', true))) {
      if (outputsLog) console.log('-dh: Open shared files');
      args.push('-dh');
    }

    // Setting whether save NTFS streams (NTFS = Alternate Data Stream). default: true
    if (isTruthy(obtain(options, 'containsADS', true))) {
      if (outputsLog) console.log('-os: Save NTFS streams. (NTFS = Alternate Data Stream');
      args.push('-os');
    }

    // Setting whether save or restore file owner and group (Security info). default: true
    if (isTruthy(obtain(options, 'containsSecArea', true))) {
      if (outputsLog) console.log('-ow: Save or restore file owner and group');
      args.push('-ow');
    }

    /**
     * Recurse subdirectories. "-r"
     * @note 罠すぎるオプション。例えば、-rを有効にして、圧縮対象に
     * "C:\hoge\foo.exe" を指定すると、"C:\hoge" より下層にあるすべての
     * foo.exeが圧縮対象となる。"C:\hoge\*foo.exe"を指定したことになる(？)
     * -rでなく-r0を使うと、明示的に*や?を使った時以外は期待通りの動作をする
     */
    if (isTruthy(obtain(options, 'recursesSubDir', true))) {
      if (outputsLog) console.log('-r0: Recurse subdirectories');
      args.push('-r0');
    }

    // Setting whether create solid archive. default: true
    if (isTruthy(obtain(options, 'isSolidArchive', true))) {
      if (outputsLog) console.log('-s: Create solid archive');
      args.push('-s');
    } else {
      if (outputsLog) console.log('-s-: Create none of solid archive');
      args.push('-s-');
    }

    // Assume Yes on all queries. すべての質問に'はい'と回答
    if (isTruthy(obtain(options, 'assumesYes', true))) {
      if (outputsLog) console.log('-y: Assume Yes on all queries');
      args.push('-y');
    }

    // Setting handling empty directories. default: add
    if (isFalsy(obtain(options, 'containsEmptyDir', true))) {
      if (outputsLog) console.log('-ed: Do not add empty directories');
      args.push('-ed');
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

    if (outputsLog) console.log('-ri' + lv + ': Set priority (0-default,1-min..15-max)');

    // Add data recovery record. リカバレルコード
    var rrLv = parseInt(obtain(options, 'recoveryPer', 0), 10);

    if (rrLv === 0) {
      /* */
    } else if (0 < rrLv && rrLv <= 100) {
      if (outputsLog) console.log('-ri: Add data recovery record -> ' + rrLv + '_p');
      args.push('-rr' + rrLv + '_p');
    } else {
      if (outputsLog) console.log('-ri: Add data recovery record -> 3P');
      args.push('-rr3P');
    }

    // Expand
    if (isTruthy(obtain(options, 'expandPathsToFull', false))) {
      if (outputsLog) console.log('-ep2: Expand paths to full');
      args.push('-ep2');
    } else {
      if (outputsLog) console.log('-ep1: Exclude base directory from names');
      args.push('-ep1');
    }

    // Setting whether send all messages to stderr.
    if (isTruthy(obtain(options, 'sendAllMesToStdErr', false))) {
      if (outputsLog) console.log('-ierr: Send all messages to stderr');
      args.push('-ierr');
    }

    // Setting compression level (0-store...3-default...5-maximal).
    var cmpLv = parseInt(obtain(options, 'compressLv', 3), 10);

    if (cmpLv < 0 || 5 < cmpLv) {
      if (outputsLog) console.log('-m5: Set compression level to 5-maximal');
      args.push('-m5');
    } else {
      if (outputsLog) console.log('-m' + cmpLv + ': Set compression level (0-store..3..5-max)');
      args.push('-m' + cmpLv);
    }

    // Specify a version of archiving format.
    var rarVer = parseInt(obtain(options, 'rarVersion', 4), 10);

    if (typeof(rarVer) !== 'undefined' && rarVer !== null && rarVer < 4) {
      /* RAR2.9 */
    } else if (rarVer === 4) {
      if (outputsLog) console.log('-ma4: Specify RAR4.x of archiving format');
      args.push('-ma4');
    } else {
      if (outputsLog) console.log('-ma5: Specify RAR5.0(default) of archiving format');
      args.push('-ma5');

      if (isTruthy(obtain(options, 'symlinkAsLink', false))) {
        if (outputsLog) console.log('-ol: Process symbolic links as the link(only for RAR5.0');
        args.push('-ol');
      }
    }

    // Assign work directory.
    if (isSolidString(options.workDir)) {
      if (outputsLog) console.log('-w: Assign work directory to "' + options.workDir + '"');
      args.push('-w"' + options.workDir + '"');
    }

    // Encrypt both file data and headers.
    var password = obtain(options, 'password', null);
    if (isSolidString(password)) {
      if (outputsLog) {
        console.log(
          '-hp"****": Encrypt both file data and headers (encrypted RAR)'
        );
      }
      args.push('-hp"' + password + '"'); // @TODO convert ^ to ^^?
    }

    // Setting exclude files
    var excludePaths = obtain(options, 'excludePaths', null);
    var tmpExcludeList;
    if (isSolidArray(excludePaths)) {
      tmpExcludeList = fs.writeTmpFileSync(excludePaths.join(os.EOL), {
        encoding: os.cmdCodeset() // @TODO Using UTF8-BOM?
      });

      if (outputsLog) {
        console.log('-x@: Exclude files listed in "' + tmpExcludeList + '"');
      }
      args.push('-x@"' + tmpExcludeList + '"');
    } else if (isSolidString(excludePaths)) {
      if (outputsLog) {
        console.log('-x: Exclude specified file "' + excludePaths + '"');
      }
      args.push('-x"' + excludePaths.trim() + '"');
    }

    // Setting file paths to be archived
    var srcPaths = [];
    paths.forEach(function (val) {
      if (isSolidString(val)) srcPaths.push(path.resolve(val));
    });

    // Setting the destination RAR file path
    var destRar = dest;

    if (isEmpty(destRar)) {
      destRar = srcPaths[0].replace(/\*/g, '').replace(/\\?$/, '.rar');
    } else if (fs.existsSync(destRar) && fs.statSync(destRar).isDirectory()) {
      // When dest was specifed a existing directory,
      destRar = destRar.replace(/\\?$/, path.sep + path.basename(srcPaths[0]) + '.rar');
    } else {
      // Create new or overwrite?
    }

    var destRarDir = path.dirname(destRar);
    if (!fs.existsSync(destRarDir)) fse.ensureDirSync(destRarDir);

    // Setting whether append the current date string to an archive name.
    var dateCode = obtain(options, 'dateCode', null);
    if (isSolidString(dateCode)) {
      destRar = destRar.replace(/\.rar/i, '_' + parseDate(dateCode) + '.rar');
    }

    args.push(destRar);

    // Setting compressed file paths
    var tmpCompressList;
    if (isSolidArray(srcPaths)) {
      // Create a list
      tmpCompressList = fs.writeTmpFileSync(srcPaths.join(os.EOL), {
        encoding: os.cmdCodeset()
      });

      args.push('@"' + tmpCompressList + '"');
    } else if (isSolidString(srcPaths)) {
      args.push(srcPaths);
    }

    // Executing
    // WinRar.exe or Rar.exe (default:WinRar.exe
    var dirWinRar = obtain(options, 'dirWinRar', DEF_DIR_WINRAR);
    var exeRar;
    var winStyle;

    if (obtain(options, 'isGUI', true)) {
      exeRar = path.join(dirWinRar, EXENAME_WINRAR);
    } else {
      exeRar = path.join(dirWinRar, EXENAME_RAR);
      winStyle = CD.windowStyles.hidden;
    }

    if (outputsLog) console.log('RAR path: "' + exeRar + '"');
    if (outputsLog) console.log('arguments: ' + args.join(' '));

    var isDryRun = obtain(options, 'isDryRun', false);
    var rtn = execFileSync(exeRar, args, {
      winStyle: winStyle,
      isDryRun: isDryRun
    });

    // Delete the temporary files.
    fse.removeSync(tmpExcludeList);
    fse.removeSync(tmpCompressList);

    if (isDryRun) return rtn; // rtn is {string}

    if (outputsLog) console.log(insp(rtn));

    // Exit values
    // @note WinRar.exeはexitCodeを返さない？
    // RAR exits with a zero exitCode (0) in case of successful operation. The exit
    // exitCode of non-zero means the operation was cancelled due to an error:
    if (rtn.error) {
      throw new Error('Failed to deflate the files\n'
        + ' ' + rtn.stderr
        + '  at ' + FN + ' (' + MODULE_TITLE + ')');
    }

    // 0: SUCCESS
    if (rtn.exitCode === 0) {
      if (outputsLog) console.log('[SUCCESS] success.');
      rtn.error = false;
      return rtn;
    }

    // 1: WARNING          Non fatal error(s) occurred
    if (rtn.exitCode === 1) {
      if (outputsLog) console.log('[WARNING] Non fatal error(s) occurred.');
      rtn.error = false;
      return rtn;
    }

    // 2: FATAL ERROR      A fatal error occurred
    if (rtn.exitCode === 2) {
      throw new Error(
        '[FATAL ERROR] A fatal error occurred.\n'
        + ' ' + rtn.stderr
        + '  at ' + FN + ' (' + MODULE_TITLE + ')'
      );
    }

    // 3: CRC ERROR        A CRC error occurred when unpacking
    if (rtn.exitCode === 3) {
      throw new Error(
        '[CRC ERROR] A CRC error occurred when unpacking.\n'
        + ' ' + rtn.stderr
        + '  at ' + FN + ' (' + MODULE_TITLE + ')'
      );
    }

    // 4: LOCKED ARCHIVE   Attempt to modify an archive previously locked
    if (rtn.exitCode === 4) {
      throw new Error(
        '[LOCKED ARCHIVE] Attempt to modify an archive previously locked by the ‘k’ command.\n'
        + ' ' + rtn.stderr
        + '  at ' + FN + ' (' + MODULE_TITLE + ')'
      );
    }

    // 5: WRITE ERROR      Write to disk error
    if (rtn.exitCode === 5) {
      throw new Error(
        '[WRITE ERROR] Write to disk error.\n'
        + ' ' + rtn.stderr
        + '  at ' + FN + ' (' + MODULE_TITLE + ')'
      );
    }

    // 6: OPEN ERROR       Open file error
    if (rtn.exitCode === 6) {
      throw new Error(
        '[OPEN ERROR] Open file error.\n'
        + ' ' + rtn.stderr
        + '  at ' + FN + ' (' + MODULE_TITLE + ')'
      );
    }

    // 7: USER ERROR       Command line option error
    if (rtn.exitCode === 7) {
      throw new Error(
        '[USER ERROR] Command line option error.\n'
        + ' ' + rtn.stderr
        + '  at ' + FN + ' (' + MODULE_TITLE + ')'
      );
    }

    // 8: MEMORY ERROR     Not enough memory for operation
    if (rtn.exitCode === 8) {
      throw new Error(
        '[MEMORY ERROR] Not enough memory for operation.\n'
        + ' ' + rtn.stderr
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
   * @param {boolean} [options.isGUI=true] - true:WinRar.exe false:Rar.exe
   * @param {boolean} [options.outputsLog=false] - Output console logs.
   * @returns {object|string} - See {@link https://docs.tuckn.net/WshChildProcess/global.html#typeRunSyncReturn|typeRunSyncReturn}. If options.isDryRun is true, returns string.
   */
  zlib.testRarSync = function (archive, options) {
    var FN = 'zlib.testRarSync';

    if (!isSolidString(archive)) throwErrNonStr(FN, archive);

    var outputsLog = obtain(options, 'outputsLog', false);
    var filePath = path.resolve(archive);

    // Set arguments
    var args = ['t', filePath];

    // Executing
    // WinRar.exe or Rar.exe (default:WinRar.exe
    var dirWinRar = obtain(options, 'dirWinRar', DEF_DIR_WINRAR);
    var exeRar;
    var winStyle;

    if (obtain(options, 'isGUI', true)) {
      exeRar = path.join(dirWinRar, EXENAME_WINRAR);
    } else {
      exeRar = path.join(dirWinRar, EXENAME_RAR);
      winStyle = CD.windowStyles.hidden;
    }

    if (outputsLog) console.log('RAR path: "' + exeRar + '"');
    if (outputsLog) console.log('arguments: ' + args.join(' '));

    var rtn = execFileSync(exeRar, args, { winStyle: winStyle });

    if (outputsLog) console.log(insp(rtn));

    // Exit values
    // RAR exits with a zero exitCode (0) in case of successful operation.
    // Non-zero exit exitCode indicates some kind of error:
    if (rtn.error) {
      throw new Error('Failed to test the files\n'
        + ' ' + rtn.stderr
        + '  at ' + FN + ' (' + MODULE_TITLE + ')');
    }

    // 0: Successful operation.
    if (rtn.exitCode === 0) {
      if (outputsLog) console.log('Successful operation.');
      rtn.error = false;
      return rtn;
    }

    // 1: Non fatal error(s) occurred.
    if (rtn.exitCode === 1) {
      if (outputsLog) console.log('Non fatal error(s) occurred.');
      rtn.error = false;
      return rtn;
    }

    // 2: A fatal error occurred.
    if (rtn.exitCode === 2) {
      throw new Error(
        'A fatal error occurred.'
        + ' ' + rtn.stderr
        + '  at ' + FN + ' (' + MODULE_TITLE + ')'
      );
    }

    // 3: Invalid checksum. Data is damaged.
    if (rtn.exitCode === 3) {
      throw new Error(
        'Invalid checksum. Data is damaged.'
        + ' ' + rtn.stderr
        + '  at ' + FN + ' (' + MODULE_TITLE + ')'
      );
    }

    // 4: Attempt to modify an archive locked by 'k' command.
    if (rtn.exitCode === 4) {
      throw new Error(
        ''
        + ' ' + rtn.stderr
        + '  at ' + FN + ' (' + MODULE_TITLE + ')'
      );
    }

    // 5: Write error.
    if (rtn.exitCode === 5) {
      throw new Error(
        '[WRITE ERROR] Write to disk error.\n'
        + ' ' + rtn.stderr
        + '  at ' + FN + ' (' + MODULE_TITLE + ')'
      );
    }

    // 6: File open error.
    if (rtn.exitCode === 6) {
      throw new Error(
        '[OPEN ERROR] Open file error.\n'
        + ' ' + rtn.stderr
        + '  at ' + FN + ' (' + MODULE_TITLE + ')'
      );
    }

    // 7: Wrong command line option.
    if (rtn.exitCode === 7) {
      throw new Error(
        '[USER ERROR] Command line option error.\n'
        + ' ' + rtn.stderr
        + '  at ' + FN + ' (' + MODULE_TITLE + ')'
      );
    }

    // 8: Not enough memory.
    if (rtn.exitCode === 8) {
      throw new Error(
        '[MEMORY ERROR] Not enough memory for operation.\n'
        + ' ' + rtn.stderr
        + '  at ' + FN + ' (' + MODULE_TITLE + ')'
      );
    }

    // 9: File create error
    if (rtn.exitCode === 9) {
      throw new Error(
        '[CREATE ERROR] Create file error.\n'
        + ' ' + rtn.stderr
        + '  at ' + FN + ' (' + MODULE_TITLE + ')'
      );
    }

    // 10: No files matching the specified mask and options were found.
    if (rtn.exitCode === 10) {
      throw new Error(
        'No files matching the specified mask and options were found.\n'
        + ' ' + rtn.stderr
        + '  at ' + FN + ' (' + MODULE_TITLE + ')'
      );
    }

    // 11: Wrong password.
    if (rtn.exitCode === 11) {
      throw new Error(
        'Wrong password.'
        + ' ' + rtn.stderr
        + '  at ' + FN + ' (' + MODULE_TITLE + ')'
      );
    }

    // 255: User stopped the process.
    if (rtn.exitCode === 255) {
      throw new Error(
        '[USER BREAK] User stopped the process.\n'
        + ' ' + rtn.stderr
        + '  at ' + FN + ' (' + MODULE_TITLE + ')'
      );
    }

    throw new Error(
      '[UNKNOWN EXIT CODE] The testing process probably failed\n'
      + ' ' + rtn.stderr
      + '  at ' + FN + ' (' + MODULE_TITLE + ')'
    );
  }; // }}}

  // zlib.openRar {{{
  /**
   * Opens the RAR file.
   *
   * @function openRar
   * @memberof Wsh.ZLIB
   * @param {string} archive - A archive filepath
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

    // Executing
    var winStyle = obtain(options, 'winStyle', CD.windowStyles.activeDef);
    execFile(exeRar, [filePath], { winStyle: winStyle });
  }; // }}}

  // zlib.unrarSync {{{
  /**
   * Extracts files from archiver with Rar.
   *
   * @function unrarSync
   * @memberof Wsh.ZLIB
   * @param {string} archive A archive file path
   * @param {string} [destDir] A output directory path.
   * @param {object} [options] - Optional parameters.
   * @param {string} [options.dirWinRar=DEF_DIR_WINRAR] - A custom directory path of WinRAR.
   * @param {boolean} [options.isGUI=true] - true:WinRar.exe false:Rar.exe
   * @param {string} [options.password]
   * @param {boolean} [options.makesDir=true] Make a new directory with archive file name
   * @param {boolean} [options.outputsLog=false] - Output console logs.
   * @returns {object} - See {@link https://docs.tuckn.net/WshChildProcess/global.html#typeRunSyncReturn|typeRunSyncReturn}.
   */
  zlib.unrarSync = function (archive, destDir, options) {
    var FN = 'zlib.unrarSync';

    if (!isSolidString(archive)) throwErrNonStr(FN, archive);

    var outputsLog = obtain(options, 'outputsLog', false);

    // Setting arguments
    var srcPath = path.resolve(archive);

    // Setting the UnRar password
    var password = obtain(options, 'password', null);
    if (!isEmpty(password)) {
      if (outputsLog) console.log('-p"****": Set the password');
      // @TODO args.push('-p"' + password.toCmdArg() + '"');
    }

    // Setting the output directory path.
    // If it is not specified, set the srcPath directory.
    if (isEmpty(destDir)) destDir = path.dirname(srcPath);

    destDir = path.resolve(destDir);

    if (obtain(options, 'makesDir', true)) {
      destDir = path.join(destDir, path.parse(srcPath).name);
    }

    // Creating the destination directory
    if (!fs.existsSync(destDir)) fse.ensureDirSync(destDir);

    var args = ['x', '-y', '-ri0', srcPath, destDir];

    // Executing
    // WinRar.exe or Rar.exe (default:WinRar.exe
    var dirWinRar = obtain(options, 'dirWinRar', DEF_DIR_WINRAR);
    var exeRar;
    var winStyle;

    if (obtain(options, 'isGUI', true)) {
      exeRar = path.join(dirWinRar, EXENAME_WINRAR);
    } else {
      exeRar = path.join(dirWinRar, EXENAME_RAR);
      winStyle = CD.windowStyles.hidden;
    }

    if (outputsLog) console.log('RAR path: "' + exeRar + '"');
    if (outputsLog) console.log('arguments: ' + args.join(' '));

    var rtn = execFileSync(exeRar, args, { winStyle: winStyle });

    if (outputsLog) console.log(insp(rtn));

    // Exit values
    // @note WinRar.exeはexitCodeを返さない？
    // RAR exits with a zero exitCode (0) in case of successful operation.
    // Non-zero exit exitCode indicates some kind of error:
    if (rtn.error) {
      throw new Error('Failed to unRar the files\n'
        + ' ' + rtn.stderr
        + '  at ' + FN + ' (' + MODULE_TITLE + ')');
    }
    // 0: Successful operation.
    if (rtn.exitCode === 0) {
      if (outputsLog) console.log('[SUCCESS] Successful operation.');
      rtn.error = false;
      return rtn;
    }

    // 1: Non fatal error(s) occurred.
    if (rtn.exitCode === 1) {
      if (outputsLog) console.log('Non fatal error(s) occurred.');
      rtn.error = false;
      return rtn;
    }

    // 2: A fatal error occurred.
    if (rtn.exitCode === 2) {
      throw new Error(
        '[FATAL ERROR] A fatal error occurred.\n'
        + ' ' + rtn.stderr
        + '  at ' + FN + ' (' + MODULE_TITLE + ')'
      );
    }

    // 3: Invalid checksum. Data is damaged.
    if (rtn.exitCode === 3) {
      throw new Error(
        'Invalid checksum. Data is damaged.'
        + ' ' + rtn.stderr
        + '  at ' + FN + ' (' + MODULE_TITLE + ')'
      );
    }

    // 4: Attempt to modify an archive locked by 'k' command.
    if (rtn.exitCode === 4) {
      throw new Error(
        ''
        + ' ' + rtn.stderr
        + '  at ' + FN + ' (' + MODULE_TITLE + ')'
      );
    }

    // 5: Write error.
    if (rtn.exitCode === 5) {
      throw new Error(
        '[WRITE ERROR] Write to disk error.\n'
        + ' ' + rtn.stderr
        + '  at ' + FN + ' (' + MODULE_TITLE + ')'
      );
    }

    // 6: File open error.
    if (rtn.exitCode === 6) {
      throw new Error(
        '[OPEN ERROR] Open file error.\n'
        + ' ' + rtn.stderr
        + '  at ' + FN + ' (' + MODULE_TITLE + ')'
      );
    }

    // 7: Wrong command line option.
    if (rtn.exitCode === 7) {
      throw new Error(
        '[USER ERROR] Wrong command line option.\n'
        + ' ' + rtn.stderr
        + '  at ' + FN + ' (' + MODULE_TITLE + ')'
      );
    }

    // 8: Not enough memory.
    if (rtn.exitCode === 8) {
      throw new Error(
        '[MEMORY ERROR] Not enough memory for operation.\n'
        + ' ' + rtn.stderr
        + '  at ' + FN + ' (' + MODULE_TITLE + ')'
      );
    }

    // 9: File create error
    if (rtn.exitCode === 9) {
      throw new Error(
        '[CREATE ERROR] Create file error.\n'
        + ' ' + rtn.stderr
        + '  at ' + FN + ' (' + MODULE_TITLE + ')'
      );
    }

    // 10: No files matching the specified mask and options were found.
    if (rtn.exitCode === 10) {
      throw new Error(
        'No files matching the specified mask and options were found.\n'
        + ' ' + rtn.stderr
        + '  at ' + FN + ' (' + MODULE_TITLE + ')'
      );
    }

    // 11: Wrong password.
    if (rtn.exitCode === 11) {
      throw new Error(
        'Wrong password.'
        + ' ' + rtn.stderr
        + '  at ' + FN + ' (' + MODULE_TITLE + ')'
      );
    }

    // 255: User stopped the process.
    if (rtn.exitCode === 255) {
      throw new Error(
        '[USER BREAK] User stopped the process.\n'
        + ' ' + rtn.stderr
        + '  at ' + FN + ' (' + MODULE_TITLE + ')'
      );
    }

    throw new Error(
      '[UNKNOWN EXIT CODE] The unRar process probably failed\n'
      + ' ' + rtn.stderr
      + '  at ' + FN + ' (' + MODULE_TITLE + ')'
    );
  }; // }}}
}());

// vim:set foldmethod=marker commentstring=//%s :
