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
  var os = Wsh.OS;
  var path = Wsh.Path;
  var fs = Wsh.FileSystem;
  var child_process = Wsh.ChildProcess;
  var fse = Wsh.FileSystemExtra;
  var logger = Wsh.Logger;
  var userset = Wsh.UserSettings;

  var obtain = util.obtainPropVal;
  var isArray = util.types.isArray;
  var isEmpty = util.isEmpty;
  var isFalsy = util.types.isFalsy;
  var isSolidString = util.isSolidString;
  var isTruthy = util.types.isTruthy;
  var isSameStr = util.types.isSameMeaning;
  var parseDate = util.createDateString;
  var execFile = child_process.execFile;
  var execFileSync = child_process.execFileSync;

  var zlib = Wsh.ZLIB;

  /** @constant {string} */
  var MODULE_TITLE = 'WshNet/ZLIB.js';

  /** @constant {string} */
  var DEF_DIR_7ZIP = 'C:\\Program Files\\7-Zip';

  /** @constant {string} */
  var EXENAME_7Z = '7z.exe';

  /** @constant {string} */
  var EXENAME_7ZFM = '7zFM.exe';

  /** @constant {string} */
  var DEF_DIR_WINRAR = 'C:\\Program Files\\WinRAR';

  /** @constant {string} */
  var EXENAME_WINRAR = 'WinRar.exe';

  /** @constant {string} */
  var EXENAME_RAR = 'Rar.exe';

  zlib.settingsName = 'zlib';
  zlib.propName7zip = '7zip';
  zlib.propNameWinrar = 'Winrar';

  var throwErrInvalidValue = function (functionName, argName, typeErrVal) {
    util.throwValueError(argName, MODULE_TITLE, functionName, typeErrVal);
  };

  var throwErrNonStr = function (functionName, typeErrVal) {
    util.throwTypeError('string', MODULE_TITLE, functionName, typeErrVal);
  };

  /**
   * @function getExePath {{{
   * @param {userset.Class/String} [users] See WshCore/UserSettings.js:load
   * @param {String} propName
   * @param {Associative Array} [options]
   *   {String} [exeName]
   *   {String} [specifiedExe]
   *   {String} [defPath]
   * @return
   */
  var getExePath = function (users, propName, options) {
    var specifiedExe = obtain(options, 'specifiedExe', null);
    if (!isEmpty(specifiedExe)) return specifiedExe;

    var defPath = obtain(options, 'defPath', null);
    var userobj = userset.load({ users: users });
    var fullPath = userobj.getFullPath(zlib.settingsName, propName, {
      defPath: defPath
    });

    var exeName = obtain(options, 'exeName', null);
    if (!isEmpty(exeName)) return path.join(fullPath, exeName);
    return fullPath;
  }; // }}}

  /**
   * @description 7-Zip {{{
7-Zip [32] 16.04 : Copyright (c) 1999-2016 Igor Pavlov : 2016-10-04

Usage: 7z <command> [<switches>...] <archive_name> [<file_names>...]
       [<@listfiles...>]

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
  -- : Stop switches parsing
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
  -r[-|0] : Recurse subdirectories
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
  -ssw : compress shared files
  -stl : set archive timestamp from the most recently modified file
  -stm{HexMask} : set CPU thread affinity mask (hexadecimal number)
  -stx{Type} : exclude archive type
  -t{Type} : Set type of archive
  -u[-][p#][q#][r#][x#][y#][z#][!newArchiveName] : Update options
  -v{Size}[b|k|m|g] : Create volumes
  -w[{path}] : assign Work directory. Empty path means a temporary directory
  -x[r[-|0]]{@listfile|!wildcard} : eXclude filenames
  -y : assume Yes on all queries }}}
  */

  // zlib.deflateSync {{{
  /**
   * Compresses and encrypts files into ZIP with 7-Zip.
   *
   * @function deflateSync
   * @memberof Wsh.ZLIB
   * @param {string|Array} paths - The filepaths that compressed.
   * @param {string} dest - The filepath or directory of destination ZIP.
   * @param {object} [options] - Optional parameters.
   * @param {string} [options.dir7zip=DEF_DIR_7ZIP] - A custom directory path of 7-ZIP.
   * @param {string} [options.dateCode] - If specify "yyyy-MM-dd" to Zipfile name is <name>_yyyy-MM-dd.zip
   * @param {number|string} [options.compressLv=5] Level of compression. 1,3,5,7,9 or Fastest, Fast, Normal, Maximum, Ultra
   * @param {Array|string} [options.excludePaths]
   * @param {string} [options.password] - -p (set password)
   * @param {string} [options.workingDir] - Working directory
   * @param {boolean} [options.outputsLog=true] - Output console logs.
   * @param {boolean} [options.isDryRun=false] - No execute, returns the string of command.
   * @returns {object|string} - See {@link https://docs.tuckn.net/WshChildProcess/global.html#typeRunSyncReturn|typeRunSyncReturn}. If options.isDryRun is true, returns string.
   */
  zlib.deflateSync = function (paths, dest, options) {
    var FN = 'zlib.deflateSync';

    if (isEmpty(paths)) throwErrInvalidValue(FN, 'paths', paths);

    var outputsLog = obtain(options, 'outputsLog', true);

    // Setting the .exe path
    var dir7zip = obtain(options, 'dir7z', DEF_DIR_7ZIP);
    var exe7z = path.join(dir7zip, EXENAME_7Z);

    // Set arguments
    // lggr.info('a: Add files to archive');
    if (outputsLog) console.log('u : Update files to archive');
    if (outputsLog) console.log('-tzip: Set ZIP type of archive');
    if (outputsLog) console.log('-ssw: Compress shared(locked) files');
    var args = ['u', '-tzip', '-ssw'];

    // Set compression level (-mx1(fastest) ... -mx9(ultra)')
    var compressLv = obtain(options, 'compressLv', null);
    if (!isEmpty(compressLv)) {
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
      args.push(mxN);
    }

    // Set a zip password (-p{Password})
    //   -mhe=on Encode a archive header(7z only!)
    // @note .zipの場合、暗号化しても格納ファイルの構造は見れちゃう
    var password = obtain(options, 'password', null);
    if (!isEmpty(password)) {
      if (outputsLog) console.log('-p"****": Set the password (-mem=AES256)');
      args.push('-p"' + password.toCmdArg() + '"', '-mem=AES256');
    }

    // Assign a working directory (-w[{path}])
    var workingDir = obtain(options, 'workingDir', null);
    if (!isEmpty(workingDir)) {
      if (outputsLog) console.log('-w"' + workingDir + '": Assign the working directory');
      args.push('-w"' + workingDir + '"');
    }

    // Set exclude of filepaths (-xr!"path")
    var excludePaths = obtain(options, 'excludePaths', null);
    if (!isEmpty(excludePaths)) {
      var excludePathsStr = '';

      if (isArray(excludePaths)) {
        args.push(excludePaths.reduce(function (acc, val) {
          excludePathsStr += ', "' + val + '"';
          return acc + '-xr!"' + val + '" ';
        }, ''));
      } else {
        excludePathsStr = '"' + excludePaths + '"';
        args.push('-xr!"' + excludePaths + '"');
      }

      if (outputsLog) console.log('-xr!: Set exclude of filepaths ' + excludePathsStr);
    }

    var srcPaths = [];
    if (isArray(paths)) {
      paths.forEach(function (val) {
        if (isEmpty(val)) return;
        srcPaths.push(path.resolve(val));
      });
    } else if (isSolidString(paths)) {
      srcPaths.push(paths);
    } else {
      throwErrInvalidValue(FN, 'paths', paths);
    }

    // Set a creating ZIP file path
    var destZip = dest;

    if (isEmpty(destZip)) {
      destZip = srcPaths[0].replace(/\*/g, '').replace(/\\?$/, '.zip');
    } else if (fs.existsSync(destZip) && fs.statSync(destZip).isDirectory()) {
      // When specified the dest and it's a existing directory,
      destZip = destZip.replace(/\\?$/, path.sep + path.basename(srcPaths[0]) + '.zip');
    } else {
      // Create new or overwrite?
    }

    var destZipDir = path.dirname(destZip);
    if (!fs.existsSync(destZipDir)) fse.ensureDirSync(destZipDir);

    var dateCode = obtain(options, 'dateCode', null);
    if (isSolidString(dateCode)) {
      destZip = destZip.replace(/\.zip$/i, '_' + parseDate(dateCode) + '.zip');
    }

    // // @TODO 同名のファイルがある場合
    // if (fs.statSync(destZip).isFile()) {
    //   if (fs.statSync(destZip + '.tmp').isFile()) { // .zip.tmpすらある場合削除
    //     fs.unlinkSync(destZip + '.tmp');
    //   }
    //
    //   fso.MoveFile(destZip, destZip + '.tmp');
    // }

    args.push('"' + destZip + '"');

    // Adding the filepaths to the 7-ZIP argument.
    args.push(
      srcPaths.reduce(function (acc, val) {
        return acc + '"' + val + '" ';
      }, '')
    );

    // TODO:
    // Set exclude of filelists (-xr@"path")

    // Executing
    if (outputsLog) console.log('7zip path: "' + exe7z + '"');
    if (outputsLog) console.log('arguments: ' + args.join(' '));

    var isDryRun = obtain(options, 'isDryRun', false);
    var rtn = execFileSync(exe7z, args, {
      winStyle: CD.windowStyles.hidden,
      isDryRun: isDryRun
    });

    if (isDryRun) return rtn; // {string}

    if (outputsLog) console.log(util.assocToStr(rtn));

    // Exit values
    if (rtn.error) {
      throw new Error('Failed to deflate the files\n'
        + ' ' + rtn.stderr
        + '  at ' + FN + ' (' + MODULE_TITLE + ')');
    }

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

    if (outputsLog) console.log('UNKNOWN EXIT CODE');
    rtn.error = true;

    // // @TODO 退避させた同名ファイルの処理
    // if (fs.statSync(newZipPath + '.tmp').isFile()) {
    //   if (assoc.error) { // エラーなら元に戻す
    //     fso.MoveFile(newZipPath + '.tmp', newZipPath);
    //   } else {
    //     fs.unlinkSync(newZipPath + '.tmp');
    //   }
    // }

    return rtn;
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
   * @returns {void}
   */
  zlib.openZip = function (archive, options) {
    var FN = 'zlib.openZip';

    if (!isSolidString(archive)) throwErrNonStr(FN, archive);

    var filePath = path.resolve(archive);

    // Setting the .exe path
    var dir7zip = obtain(options, 'dir7z', DEF_DIR_7ZIP);
    var exe7zFM = path.join(dir7zip, EXENAME_7ZFM);

    // Executing
    execFile(exe7zFM, [filePath], { winStyle: CD.windowStyles.activeDef });
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
   * @param {boolean} [options.outputsLog=true] - Output console logs.
   * @returns {object} - See {@link https://docs.tuckn.net/WshChildProcess/global.html#typeRunSyncReturn|typeRunSyncReturn}.
   */
  zlib.unzipSync = function (archive, destDir, options) {
    var FN = 'zlib.unzipSync';

    if (!isSolidString(archive)) throwErrNonStr(FN, archive);

    var outputsLog = obtain(options, 'outputsLog', true);

    // Setting the .exe path
    var dir7zip = obtain(options, 'dir7z', DEF_DIR_7ZIP);
    var exe7z = path.join(dir7zip, EXENAME_7Z);

    // Setting arguments
    if (outputsLog) console.log('x: eXtract files with full paths');
    var args = ['x'];

    // Setting the Unzip password
    var password = obtain(options, 'password', null);
    if (!isEmpty(password)) {
      if (outputsLog) console.log('-p"****": Set the password');
      args.push('-p"' + password.toCmdArg() + '"');
    }

    var srcPath = path.resolve(archive);

    // Setting the output directory path.
    // If it is not specified, set the srcPath directory.
    if (isEmpty(destDir)) destDir = path.dirname(srcPath);

    destDir = path.resolve(destDir);

    if (obtain(options, 'makesDir', true)) {
      destDir = path.join(destDir, path.parse(srcPath).name);
    }

    // Creating the directory
    if (!fs.existsSync(destDir)) fse.ensureDirSync(destDir);

    // Executing
    args.push(srcPath.toFilePath(), '-o' + destDir.toFilePath(), '-y');

    if (outputsLog) console.log('7zip path: "' + exe7z + '"');
    if (outputsLog) console.log('arguments: ' + args.join(' '));

    var rtn = execFileSync(exe7z, args, { winStyle: CD.windowStyles.hidden });

    if (outputsLog) console.log(util.assocToStr(rtn));

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

  // zlib.deflateSyncInRar {{{
  /**
   * Compresses and encrypts files into ZIP with RAR.
   *
   * @function deflateSyncInRar
   * @memberof Wsh.ZLIB
   * @param {Array} paths 圧縮対象。複数ある場合は配列にして渡す
   *   複数ある場合、リストファイルを作成し、@<lf> オプションで指定する
   * @param {String} dest A dest RAR file path or a dest directory.
   * @param {object} [options] - Optional parameters.
   * @param {string} [options.dirWinRar=DEF_DIR_WINRAR] - A custom directory path of WinRAR.
   * @param {Associative Array} options
   *   {Boolean} [.appendsDatecode=true]
   *   {String} [.password] ファイルヘッダも含めて暗号化
   *   {number} [.compressLv=5] 圧縮率 "-m0:store ～ -m5:best"
   *   {number} [.cpuPriority=0] 処理優先度(Default:0, MIN1-MAX15)
   *   {number} [.recoveryPer=3] リカバレルコード3%
   *   {String} [.excludePaths] 圧縮除外。複数ある場合は配列にして渡す
   *   {Boolean} [.updateMode="add"] "add"(-u -o+), "sync"(-u -as -o+), "mirror"
   *   {Boolean} [.skipsExistings=false] Skip existing contents
   *   {Boolean} [.containsUsingFile=true] 使用中ファイルも圧縮
   *   {Boolean} [.containsADS=true] Alternate Data Stream=NTFSストリームを格納
   *   {Boolean} [.containsSecArea=true] セキュリティ情報を保存
   *   {Boolean} [.containsEmptyDir=true] Do not add empty directories
   *   {Boolean} [.recursesSubDir=true] サブディレクトリを再帰的に圧縮
   *   {Boolean} [.isSolidArchive=true] ソリッド圧縮
   *   {Boolean} [.assumesYes=true] すべての質問に'はい'と答えます
   *   {Boolean} [.expandPathsToFull=false] false:"-ep1" 該当フォルダのみ格納
   *      true:"-ep2" フルパスで格納。他にも -epと-ep3がある
   *   {Boolean} [.sendAllMesToStdErr=true] "-ierr" Send all messages to stderr.
   *   {Boolean} [.rarVersion=5] "-ma5" Specify a version of archiving format.
   *   {Boolean} [.symlinkAsLink=false]
   *     "-ol" Process symbolic links as the link(RAR 4.x以上、Linuxのみ？)
   *   {String} [.workDir] "-w<p>" Assign work directory.
   *   {Object} [.loggerOptions] See tuckn/WshCore/Logger.js:create
   *   {Boolean} [noneSaveLog=false]
   *   {Boolean} [.isGUI=true] true:WinRar.exe false:Rar.exe
   *   {userset.Class/String} [users] See WshCore/UserSettings.js:load
   * @returns {object} assoc
   */
  zlib.deflateSyncInRar = function (paths, dest, options) {
    var FN = 'zlib.deflateSyncInRar';

    // Setting the .exe path
    var dirWinRar = obtain(options, 'dirWinRar', DEF_DIR_WINRAR);

    // WinRar.exe or Rar.exe (default:WinRar.exe
    var exeRar;
    if (obtain(options, 'isGUI', true)) {
      exeRar = path.join(dirWinRar, EXENAME_WINRAR);
    } else {
      exeRar = path.join(dirWinRar, EXENAME_RAR);
    }

    // Set arguments
    lggr.info('a: Add files to archive');
    var args = ['a'];

    // Mode of existing archive updating {{{
    var updateMode = obtain(options, 'updateMode', 'ADD');
    if (isSameStr(updateMode, 'MIRROR')) {
      // No add switches
    } else {
      lggr.info('-u: Update a existing RAR file');
      args.push('-u');

      if (isSameStr(updateMode, 'SYNC')) {
        lggr.info('-as: Synchronize archive contents');
        args.push('-as');
      }

      if (isTruthy(obtain(options, 'skipsExistings', false))) {
        lggr.info('-o-: Set the none of overwriting. (Skip existings)');
        args.push('-o-');
      } else {
        lggr.info('-o+: Set the overwriting (If existing updated, overwrite)');
        args.push('-o+');
      }
    } // }}}

    // Open shared files. 使用中のファイルを圧縮 (default: true {{{
    if (isTruthy(obtain(options, 'containsUsingFile', true))) {
      lggr.info('-dh: Open shared files');
      args.push('-dh');
    } // }}}

    // Save NTFS streams. (NTFS = Alternate Data Stream (default: true {{{
    if (isTruthy(obtain(options, 'containsADS', true))) {
      lggr.info('-os: Save NTFS streams. (NTFS = Alternate Data Stream');
      args.push('-os');
    } // }}}

    // Save or restore file owner and group. セキュリティ情報 (default: true {{{
    if (isTruthy(obtain(options, 'containsSecArea', true))) {
      lggr.info('-ow: Save or restore file owner and group');
      args.push('-ow');
    } // }}}

    /**
     * Recurse subdirectories. "-r" サブディレクトリの格納 {{{
     * @note 罠すぎるオプション。例えば、-rを有効にして、圧縮対象に
     * "C:\hoge\foo.exe" を指定すると、"C:\hoge" より下層にあるすべての
     * foo.exeが圧縮対象となる。"C:\hoge\*foo.exe"を指定したことになる(？)
     * -rでなく-r0を使うと、明示的に*や?を使った時以外は期待通りの動作をする
     */
    if (isTruthy(obtain(options, 'recursesSubDir', true))) {
      lggr.info('-r0: Recurse subdirectories');
      args.push('-r0');
    } // }}}

    // Create solid archive. ソリッド圧縮 (default: true  {{{
    if (isTruthy(obtain(options, 'isSolidArchive', true))) {
      lggr.info('-s: Create solid archive');
      args.push('-s');
    } else {
      lggr.info('-s-: Create none of solid archive');
      args.push('-s-');
    } // }}}

    // Assume Yes on all queries. すべての質問に'はい'と回答 {{{
    if (isTruthy(obtain(options, 'assumesYes', true))) {
      lggr.info('-y: Assume Yes on all queries');
      args.push('-y');
    } // }}}

    // Do not add empty directories. (default: add {{{
    if (isFalsy(obtain(options, 'containsEmptyDir', true))) {
      lggr.info('-ed: Do not add empty directories');
      args.push('-ed');
    } // }}}

    // Set priority (0-default,1-min..15-max) and sleep time in ms {{{
    var lv = parseInt(obtain(options, 'cpuPriority', 0), 10);

    if (lv === 0) {
      /* */
    } else if (lv < 0 || 15 < lv) {
      lv = 0;
    } else {
      args.push('-ri' + lv);
    }

    lggr.info('-ri' + lv + ': Set priority (0-default,1-min..15-max)');
    // }}}

    // Add data recovery record. リカバレルコード {{{
    var rrLv = parseInt(obtain(options, 'recoveryPer', 0), 10);

    if (rrLv === 0) {
      /* */
    } else if (0 < rrLv && rrLv <= 100) {
      lggr.info('-ri: Add data recovery record -> ' + rrLv + '_p');
      args.push('-rr' + rrLv + '_p');
    } else {
      lggr.info('-ri: Add data recovery record -> 3P');
      args.push('-rr3P');
    } // }}}

    // Expand {{{
    if (isTruthy(obtain(options, 'expandPathsToFull', false))) {
      lggr.info('-ep2: Expand paths to full');
      args.push('-ep2');
    } else {
      lggr.info('-ep1: Exclude base directory from names');
      args.push('-ep1');
    } // }}}

    // Send all messages to stderr. {{{
    if (isTruthy(obtain(options, 'sendAllMesToStdErr', false))) {
      lggr.info('-ierr: Send all messages to stderr');
      args.push('-ierr');
    } // }}}

    // Set compression level (0-store...3-default...5-maximal). 圧縮レベル {{{
    var cmpLv = parseInt(obtain(options, 'compressLv', 3), 10);

    if (cmpLv < 0 || 5 < cmpLv) {
      lggr.info('-m5: Set compression level to 5-maximal');
      args.push('-m5');
    } else {
      lggr.info('-m' + cmpLv + ': Set compression level (0-store..3..5-max)');
      args.push('-m' + cmpLv);
    } // }}}

    // Specify a version of archiving format. {{{
    var rarVer = parseInt(obtain(options, 'rarVersion', 4), 10);

    if (typeof(rarVer) !== 'undefined' && rarVer !== null && rarVer < 4) {
      /* RAR2.9 */
    } else if (rarVer === 4) {
      lggr.info('-ma4: Specify RAR4.x of archiving format');
      args.push('-ma4');
    } else {
      lggr.info('-ma5: Specify RAR5.0(default) of archiving format');
      args.push('-ma5');

      if (isTruthy(obtain(options, 'symlinkAsLink', false))) {
        lggr.info('-ol: Process symbolic links as the link(only for RAR5.0');
        args.push('-ol');
      }
    } // }}}

    // Assign work directory. {{{
    if (!isEmpty(options.workDir)) {
      lggr.info('-w: Assign work directory to "' + options.workDir + '"');
      args.push('-w"' + options.workDir + '"');
    } // }}}

    // Encrypt both file data and headers. {{{
    if (!isEmpty(options.password)) {
      lggr.info('-hp"****": Encrypt both file data and headers (encrypted RAR)');
      args.push('-hp"' + options.password.toCmdArg() + '"');
    } // }}}

    // Exclude {{{
    var tmpExcludeList;
    if (!isEmpty(options.excludePaths)) {
      if (isArray(options.excludePaths)) {
        tmpExcludeList = fs.writeTmpFileSync(options.excludePaths.join(os.EOL), { encoding: os.cmdCodeset() });

        lggr.info('-x@: Exclude files listed in "' + tmpExcludeList + '"');
        args.push('-x@"' + tmpExcludeList + '"');
      } else {
        lggr.info('-x: Exclude specified file "' + options.excludePaths + '"');
        args.push('-x"' + options.excludePaths.trim() + '"');
      }
    } // }}}

    var srcPaths = [];
    paths.forEach(function (val) {
      if (isEmpty(val)) return;
      srcPaths.push(path.resolve(val));
    });

    // Set a creating RAR file path {{{
    var destRar = dest;

    if (isEmpty(destRar)) {
      destRar = srcPaths[0].replace(/\*/g, '').replace(/\\?$/, '.rar');
    // When dest was specifed a existing directory,
    } else if (fs.existsSync(destRar) && fs.statSync(destRar).isDirectory()) {
      destRar = destRar.replace(/\\?$/, path.sep + path.basename(srcPaths[0]) + '.rar');
    }

    var destRarDir = path.dirname(destRar);
    if (!fs.existsSync(destRarDir)) fse.ensureDirSync(destRarDir);

    // Appends the current date string to an archive name.
    // false指定された時のみ日付を付与しない
    if (isTruthy(obtain(options, 'appendsDatecode', true))) {
      // args.push('-ag{_}YYYY-MM-DD');
      destRar = destRar.replace(/\.rar/i, '_' + parseDate() + '.rar');
    }

    args.push('"' + destRar + '"');
    // }}}

    // Set compressed file paths
    var tmpCompressList;
    if (isArray(srcPaths) && srcPaths.length > 1) {
      // Create a list
      tmpCompressList = fs.writeTmpFileSync(srcPaths.join(os.EOL), { encoding: os.cmdCodeset() });

      args.push('@"' + tmpCompressList + '"');
    } else {
      args.push(String(srcPaths).toFilePath());
    }

    // Executing
    lggr.info('RAR path: "' + exeRar + '"');
    lggr.info('arguments: ' + args.join(' '));
    var assoc = execFileSync(exeRar, args, { show: CD.winHidden });

    lggr.info(util.assocToStr(assoc));

    // Exit values  {{{
    // @note WinRar.exeはexitCodeを返さない？
    // RAR exits with a zero exitCode (0) in case of successful operation. The exit
    // exitCode of non-zero means the operation was cancelled due to an error:
    if (assoc.error) {
      lggr.error(MODULE_TITLE + ' ' + FN + '\n'
          + '  Failed to deflate the files\n'
          + ' ' + assoc.stderr);

    // 0: SUCCESS
    } else if (assoc.exitCode === 0) {
      lggr.success('[SUCCESS] success.');
      assoc.error = false;

    // 1: WARNING          Non fatal error(s) occurred
    } else if (assoc.exitCode === 1) {
      lggr.warn('[WARNING] Non fatal error(s) occurred.');
      assoc.error = false;

    // 2: FATAL ERROR      A fatal error occurred
    } else if (assoc.exitCode === 2) {
      lggr.error('[FATAL ERROR] A fatal error occurred.');
      assoc.error = true;

    // 3: CRC ERROR        A CRC error occurred when unpacking
    } else if (assoc.exitCode === 3) {
      lggr.error('[CRC ERROR] A CRC error occurred when unpacking.');
      assoc.error = true;

    // 4: LOCKED ARCHIVE   Attempt to modify an archive previously locked
    } else if (assoc.exitCode === 4) {
      lggr.error('[LOCKED ARCHIVE] Attempt to modify an archive previously locked by the ‘k’ command.');
      assoc.error = true;

    // 5: WRITE ERROR      Write to disk error
    } else if (assoc.exitCode === 5) {
      lggr.error('[WRITE ERROR] Write to disk error.');
      assoc.error = true;

    // 6: OPEN ERROR       Open file error
    } else if (assoc.exitCode === 6) {
      lggr.error('[OPEN ERROR] Open file error.');
      assoc.error = true;

    // 7: USER ERROR       Command line option error
    } else if (assoc.exitCode === 7) {
      lggr.error('[USER ERROR] Command line option error.');
      assoc.error = true;

    // 8: MEMORY ERROR     Not enough memory for operation
    } else if (assoc.exitCode === 8) {
      lggr.error('[MEMORY ERROR] Not enough memory for operation.');
      assoc.error = true;

    // 9: CREATE ERROR     Create file error
    } else if (assoc.exitCode === 9) {
      lggr.error('[CREATE ERROR] Create file error.');
      assoc.error = true;

    // 10: SAME ARCHIVE     s
    } else if (assoc.exitCode === 10) {
      lggr.warn('[SAME ARCHIVE] 更新されたファイルなし。既存RARファイルを維持');
      assoc.error = false;

    // 255: USER BREAK       User stopped the process
    } else if (assoc.exitCode === 255) {
      lggr.error('[USER BREAK] User stopped the process.');
      assoc.error = true;

    } else {
      lggr.error('[UNKNOWN EXIT CODE] 圧縮に失敗しました');
      assoc.error = true;
    }
    // }}}

    lggr.info('Finished the function ' + FN);
    var noneSaveLog = obtain(options, 'noneSaveLog', false);
    if (!noneSaveLog) lggr.transport();

    // Delete temporary file-lists.
    fse.removeSync(tmpExcludeList);
    fse.removeSync(tmpCompressList);

    return assoc;
  }; // }}}

  /**
   * @function testRarSync {{{
   * @description Test RAR
   * @param {String} archive A archive file path
   * @param {Associative Array} [options]
   *   {Object} [.loggerOptions] See tuckn/WshCore/Logger.js:create
   *   {Boolean} [noneSaveLog=false]
   *   {Boolean} [.isGUI=false] true:WinRar.exe false:Rar.exe
   *   {String} [.exeRar] A custom path of Rar/WinRar.exe
   *   {userset.Class/String} [users] See WshCore/UserSettings.js:load
   * @returns {Associative Array}
   */
  zlib.testRarSync = function (archive, options) {
    var fcName = 'zlib.testRarSync';
    var loggerOptions = obtain(options, 'loggerOptions', {});
    var lggr = logger.create(loggerOptions);
    lggr.info('Start the function ' + fcName);

    if (isEmpty(archive)) {
      throw new Error(MODULE_TITLE + ' ' + fcName + '\n  archive is empty');
    }
    var filePath = path.resolve(archive);

    // Getting the .exe path
    var exeRar = obtain(options, 'exeRar', null);
    if (isEmpty(exeRar)) {
      var users = obtain(options, 'users', null);
      var dirRar = getExePath(users, zlib.propNameWinrar, {
        defPath: DEF_DIR_WINRAR
      });

      // WinRar.exe or Rar.exe (default:Rar.exe
      if (obtain(options, 'isGUI', false)) {
        exeRar = path.join(dirRar, EXENAME_WINRAR);
      } else {
        exeRar = path.join(dirRar, EXENAME_RAR);
      }
    }

    // Set arguments
    var args = ['t', filePath.toFilePath()];

    // Executing
    lggr.info('RAR path: "' + exeRar + '"');
    lggr.info('arguments: ' + args.join(' '));
    var assoc = execFileSync(exeRar, args, { show: CD.winNonActiveMin });

    lggr.info(util.assocToStr(assoc));

    // Exit values  {{{
    // RAR exits with a zero exitCode (0) in case of successful operation.
    // Non-zero exit exitCode indicates some kind of error:
    if (assoc.error) {
      lggr.error(MODULE_TITLE + ' ' + fcName + '\n'
          + '  Failed to test "' + filePath + '"\n'
          + ' ' + assoc.stderr);

    // 0: Successful operation.
    } else if (assoc.exitCode === 0) {
      lggr.success('Successful operation.');
      assoc.error = false;

    // 1: Non fatal error(s) occurred.
    } else if (assoc.exitCode === 1) {
      lggr.warn('Non fatal error(s) occurred.');
      assoc.error = false;

    // 2: A fatal error occurred.
    } else if (assoc.exitCode === 2) {
      lggr.error('A fatal error occurred.');
      assoc.error = true;

    // 3: Invalid checksum. Data is damaged.
    } else if (assoc.exitCode === 3) {
      lggr.error('Invalid checksum. Data is damaged.');
      assoc.error = true;

    // 4: Attempt to modify an archive locked by 'k' command.
    } else if (assoc.exitCode === 4) {

    // 5: Write error.
    } else if (assoc.exitCode === 5) {
      lggr.error('Write error.');
      assoc.error = true;

    // 6: File open error.
    } else if (assoc.exitCode === 6) {
      lggr.error('File open error.');
      assoc.error = true;

    // 7: Wrong command line option.
    } else if (assoc.exitCode === 7) {
      lggr.error('Wrong command line option.');
      assoc.error = true;

    // 8: Not enough memory.
    } else if (assoc.exitCode === 8) {
      lggr.error('Not enough memory.');
      assoc.error = true;

    // 9: File create error
    } else if (assoc.exitCode === 9) {
      lggr.error('File create error.');
      assoc.error = true;

    // 10: No files matching the specified mask and options were found.
    } else if (assoc.exitCode === 10) {
      lggr.error('No files matching the specified mask and options were found.');
      assoc.error = true;

    // 11: Wrong password.
    } else if (assoc.exitCode === 11) {
      lggr.error('Wrong password.');
      assoc.error = true;

    // 255: User stopped the process.
    } else if (assoc.exitCode === 255) {
      lggr.error('User stopped the process.');
      assoc.error = true;

    } else {
      lggr.error('Unknown ExitCode.');
      assoc.error = true;
    }
    // }}}

    lggr.info('Finished the function ' + fcName);
    var noneSaveLog = obtain(options, 'noneSaveLog', false);
    if (!noneSaveLog) lggr.transport();

    return assoc;
  }; // }}}

  /**
   * @function openRar {{{
   * @description open a RAR file.
   * @param {String} archive A archive filepath
   * @param {Associative Array} [options]
   *   {String} [.exeRar] A custom path of WinRar.exe
   *   {userset.Class/String} [users] See WshCore/UserSettings.js:load
   * @return
   */
  zlib.openRar = function (archive, options) {
    if (isEmpty(archive)) {
      throw new Error(MODULE_TITLE + '(openRar)\n'
          + '  A archive path is empty: ' + archive);
    }
    var filePath = path.resolve(archive);

    // Getting the .exe path
    var users = obtain(options, 'users', null);
    var exeRar = getExePath(users, zlib.propNameWinrar, {
      exeName: EXENAME_WINRAR,
      specifiedExe: obtain(options, 'exeRar', null),
      defPath: DEF_DIR_WINRAR
    });

    // Executing
    execFile(exeRar, [filePath.toFilePath()], { show: CD.winActiveDef });
  };  // }}}

  /**
   * @function unrarSync {{{
   * @description Extract files from archiver with Rar.
   * @param {String} archive A archive file path
   * @param {String} [destDir] A output directory path.
   * @param {Associative Array} [options]
   *   {Boolean} [.makesDir=true] Make a new directory with archive file name
   *   {Object} [.loggerOptions] See tuckn/WshCore/Logger.js:create
   *   {Boolean} [noneSaveLog=false]
   *   {Boolean} [.isGUI=true] true:WinRar.exe false:Rar.exe
   *   {String} [.exeRar] A custom path of Rar/WinRar.exe
   *   {userset.Class/String} [users] See WshCore/UserSettings.js:load
   * @returns {Associative Array}
   */
  zlib.unrarSync = function (archive, destDir, options) {
    var fcName = 'zlib.unrarSync';
    var loggerOptions = obtain(options, 'loggerOptions', {});
    var lggr = logger.create(loggerOptions);
    lggr.info('Start the function ' + fcName);

    // Getting the .exe path
    var exeRar = obtain(options, 'exeRar', null);
    if (isEmpty(exeRar)) {
      var users = obtain(options, 'users', null);
      var dirRar = getExePath(users, zlib.propNameWinrar, {
        defPath: DEF_DIR_WINRAR
      });

      // WinRar.exe or Rar.exe (default:WinRar.exe
      if (obtain(options, 'isGUI', true)) {
        exeRar = path.join(dirRar, EXENAME_WINRAR);
      } else {
        exeRar = path.join(dirRar, EXENAME_RAR);
      }
    }

    // Set arguments
    var srcPath = path.resolve(archive);
    // Set a output directory path.
    // 指定がない場合はsrcPathのフォルダに設定する
    // false指定された時のみフォルダを作成せず直接解凍する
    if (isEmpty(destDir)) destDir = path.dirname(srcPath);

    destDir = path.resolve(destDir);

    if (obtain(options, 'makesDir', true)) {
      destDir = path.join(destDir, path.parse(srcPath).name);
    }

    if (!fs.existsSync(destDir)) fse.ensureDirSync(destDir);

    var args = ['x', '-y', '-ri0', srcPath.toFilePath(), destDir.toFilePath()];

    // Executing
    lggr.info('RAR path: "' + exeRar + '"');
    lggr.info('arguments: ' + args.join(' '));
    var assoc = execFileSync(exeRar, args, { show: CD.winHidden });

    lggr.info(util.assocToStr(assoc));

    // Exit values  {{{
    // @note WinRar.exeはexitCodeを返さない？
    // RAR exits with a zero exitCode (0) in case of successful operation.
    // Non-zero exit exitCode indicates some kind of error:
    if (assoc.error) {
      lggr.error(MODULE_TITLE + ' ' + fcName + '\n'
          + '  Failed to unrar "' + srcPath + '"\n'
          + ' ' + assoc.stderr);

    // 0: Successful operation.
    } else if (assoc.exitCode === 0) {
      lggr.success('Successful operation.');
      assoc.error = false;

    // 1: Non fatal error(s) occurred.
    } else if (assoc.exitCode === 1) {
      lggr.warn('Non fatal error(s) occurred.');
      assoc.error = false;

    // 2: A fatal error occurred.
    } else if (assoc.exitCode === 2) {
      lggr.error('A fatal error occurred.');
      assoc.error = true;

    // 3: Invalid checksum. Data is damaged.
    } else if (assoc.exitCode === 3) {
      lggr.error('Invalid checksum. Data is damaged.');
      assoc.error = true;

    // 4: Attempt to modify an archive locked by 'k' command.
    } else if (assoc.exitCode === 4) {

    // 5: Write error.
    } else if (assoc.exitCode === 5) {
      lggr.error('Write error.');
      assoc.error = true;

    // 6: File open error.
    } else if (assoc.exitCode === 6) {
      lggr.error('File open error.');
      assoc.error = true;

    // 7: Wrong command line option.
    } else if (assoc.exitCode === 7) {
      lggr.error('Wrong command line option.');
      assoc.error = true;

    // 8: Not enough memory.
    } else if (assoc.exitCode === 8) {
      lggr.error('Not enough memory.');
      assoc.error = true;

    // 9: File create error
    } else if (assoc.exitCode === 9) {
      lggr.error('File create error.');
      assoc.error = true;

    // 10: No files matching the specified mask and options were found.
    } else if (assoc.exitCode === 10) {
      lggr.error('No files matching the specified mask and options were found.');
      assoc.error = true;

    // 11: Wrong password.
    } else if (assoc.exitCode === 11) {
      lggr.error('Wrong password.');
      assoc.error = true;

    // 255: User stopped the process.
    } else if (assoc.exitCode === 255) {
      lggr.error('User stopped the process.');
      assoc.error = true;

    } else {
      lggr.error('Unknown ExitCode.');
      assoc.error = true;
    }
    // }}}

    lggr.info('Finished the function ' + fcName);
    var noneSaveLog = obtain(options, 'noneSaveLog', false);
    if (!noneSaveLog) lggr.transport();

    return assoc;
  }; // }}}
}());

// vim:set foldmethod=marker commentstring=//%s :
