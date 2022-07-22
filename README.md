# WshZLIB

This module provides helper WSH (Windows Script Host) functions that handle archiver apps (7-Zip and RAR). Usage: [WshZLIB](https://github.com/tuckn/WshZLIB)

## tuckn/Wsh series dependency

[WshModeJs](https://github.com/tuckn/WshModeJs)  
└─ WshZLIB - This repository  
&emsp;└─ [WshNet](https://github.com/tuckn/WshNet)  
&emsp;&emsp;└─ [WshChildProcess](https://github.com/tuckn/WshChildProcess)  
&emsp;&emsp;&emsp;└─ [WshProcess](https://github.com/tuckn/WshProcess)  
&emsp;&emsp;&emsp;&emsp;&emsp;└─ [WshFileSystem](https://github.com/tuckn/WshFileSystem)  
&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;└─ [WshOS](https://github.com/tuckn/WshOS)  
&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;└─ [WshPath](https://github.com/tuckn/WshPath)  
&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;└─ [WshUtil](https://github.com/tuckn/WshUtil)  
&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;└─ [WshPolyfill](https://github.com/tuckn/WshPolyfill)  

The upper layer module can use all the functions of the lower layer module.

## Operating environment

Works on JScript in Windows.

## Installation

(1) Create a directory of your WSH project.

```console
D:\> mkdir MyWshProject
D:\> cd MyWshProject
```

(2) Download this ZIP and unzip or Use the following `git` command.

```console
> git clone https://github.com/tuckn/WshZLIB.git ./WshModules/WshZLIB
or
> git submodule add https://github.com/tuckn/WshZLIB.git ./WshModules/WshZLIB
```

(3) Create your JScript (.js) file. For Example,

```console
D:\MyWshProject\
├─ MyScript.js <- Your JScript code will be written in this.
└─ WshModules\
    └─ WshZLIB\
        └─ dist\
          └─ bundle.js
```

I recommend JScript (.js) file encoding to be UTF-8 [BOM, CRLF].

(4) Create your WSF packaging scripts file (.wsf).

```console
D:\MyWshProject\
├─ Run.wsf <- WSH entry file
├─ MyScript.js
└─ WshModules\
    └─ WshZLIB\
        └─ dist\
          └─ bundle.js
```

And you should include _.../dist/bundle.js_ into the WSF file.
For Example, The content of the above _Run.wsf_ is

```xml
<package>
  <job id = "run">
    <script language="JScript" src="./WshModules/WshZLIB/dist/bundle.js"></script>
    <script language="JScript" src="./MyScript.js"></script>
  </job>
</package>
```

I recommend this WSH file (.wsf) encoding to be UTF-8 [BOM, CRLF].

Awesome! This WSH configuration allows you to use the following functions in JScript (_.\\MyScript.js_).

## Usage

Now your JScript (_.\\MyScript.js_ ) can use helper functions to handle 7-Zip and RAR.
For example,

### 7-Zip

```js
var zlib = Wsh.ZLIB; // Shorthand
var path = Wsh.Path;

var exe7z = path.join(__dirname, '.\\bin\\7-Zip\\7z.exe');

// Zipping a directory
var rtn = zlib.deflateSync('C:\\My Data', 'D:\\Backup.zip', {
  exe7z: exe7z
});

console.dir(rtn);
// Outputs:
// { command: "C:\My script\bin\7-Zip\7z.exe" u -tzip -ssw -r- "D:\\Backup.zip" @"C:\Users\<Your Name>\AppData\Local\Temp\fs-writeTmpFileSync_rad3CD32.tmp"",
//   exitCode: 0,
//   stdout: "
// 7-Zip 22.00 (x64) : Copyright (c) 1999-2022 Igor Pavlov : 2022-06-15
// ...
// ..
// Everything is Ok
// ",
//   stderr: "",
//   error: false,
//   archivedPath: "D:\\Backup.zip" }

// With many options
var rtn = zlib.deflateSync('C:\\My Data\\*.txt', 'D:\\Backup.zip', {
  dateCode: 'yyyyMMdd-HHmmss',
  compressLv: 9,
  password: 'This is mY&p@ss ^_<',
  excludingFiles: ['*SJIS*'],
  includesSubDir: true,
  exe7z: exe7z
});

console.dir(rtn);
// Outputs:
// { command: "C:\My script\bin\7-Zip\7z.exe" u -tzip -ssw -r -xr@"C:\Users\<Your Name>\AppData\Local\Temp\fs-writeTmpFileSync_radD1C8B.tmp" -mx9 -p"This is mY&p@ss ^_<" -mem=AES256 "D:\\Backup_20220722-100513.zip" @"C:\Users\<Your Name>\AppData\Local\Temp\fs-writeTmpFileSync_radA1BD8.tmp"",
//   exitCode: 0,
//   stdout: "
// 7-Zip 22.00 (x64) : Copyright (c) 1999-2022 Igor Pavlov : 2022-06-15
// ...
// ..
// Everything is Ok
// ",
//   stderr: "",
//   error: false,
//   archivedPath: "D:\\Backup_20220722-100513.zip" }

// Opening a zip file
var exe7zFM = path.join(__dirname, '.\\bin\\7-Zip\\7zFM.exe');
zlib.openZip('D:\\Backup.zip', { exe7zFM: exe7zFM });

// Unzipping a zip file
var rtn = zlib.unzipSync('D:\\Backup.zip', 'C:\\Temp', {
  makesArchiveNameDir: true,
  exe7z: exe7z
});
```

### WinRAR

```js
var zlib = Wsh.ZLIB; // Shorthand
var path = Wsh.Path;

var dirWinRar = path.join(__dirname, '.\\bin\\WinRar');

// Archiving a directory as a Rar file
var rtn = zlib.deflateSyncIntoRar('C:\\My Data', 'D:\\Backup.rar', {
  dirWinRar: dirWinRar
});

console.dir(rtn);
// Outputs:
// { command: "C:\My Script\bin\WinRAR\Rar.exe" a -u -o+ -r0 -dh -ep1 -m3 -ma5 -os -s -y "D:\Backup.rar" @"C:\Users\Your Name\AppData\Local\Temp\fs-writeTmpFileSync_radB5E4E.tmp"",
//   exitCode: 0,
//   stdout: "
// RAR 6.11 x64   Copyright (c) 1993-2022 Alexander Roshal   3 Mar 2022
// ...
// ..
// Done
// ",
//   stderr: "",
//   error: false,
//   archivedPath: "D:\\Backup.rar" }

// With many options
var rtn = zlib.deflateSyncIntoRar('C:\\My Data\\*.txt', 'D:\\Backup.rar', {
  dateCode: 'yyyyMMdd-HHmmss',
  compressLv: 0,
  password: 'This is mY&p@ss ^_<',
  excludingFiles: ['*utf16*', 'settings.json'],
  excludesEmptyDir: true,
  excludesSubDirWildcard: true,
  isGUI: true,
  dirWinRar: dirWinRar
});

console.dir(rtn);
// Outputs:
// { command: "C:\My Script\bin\WinRAR\WinRar.exe" a -u -o+ -x@"C:\Users\<Your Name>\AppData\Local\Temp\fs-writeTmpFileSync_rad017F1.tmp" -dh -ed -ep1 -m0 -hp"This is mY&p@ss ^_<" -ma5 -os -s -y "D:\Backup_20220722-103741.rar" @"C:\Users\<Your Name>\AppData\Local\Temp\fs-writeTmpFileSync_rad89C8F.tmp",
//  exitCode: 0,
//  stdout: "",
//  stderr: "",
//  error: false,
//  archivedPath: "D:\Backup_20220722-103741.rar" }

// Opening a Rar file
zlib.openRar('D:\\Backup.rar', { dirWinRar: dirWinRar });

// Unzipping a Rar file
var rtn = zlib.unrarSync('D:\\Backup.rar', 'C:\\Temp', {
  makesArchiveNameDir: true,
  dirWinRar: dirWinRar;
});

// and so on...
```

Many other functions will be added.
See the [documentation](https://docs.tuckn.net/WshZLIB) for more details.

### Dependency Modules

You can also use the following helper functions in your JScript (_.\\MyScript.js_).

- [tuckn/WshPolyfill](https://github.com/tuckn/WshPolyfill)
- [tuckn/WshUtil](https://github.com/tuckn/WshUtil)
- [tuckn/WshPath](https://github.com/tuckn/WshPath)
- [tuckn/WshOS](https://github.com/tuckn/WshOS)
- [tuckn/WshFileSystem](https://github.com/tuckn/WshFileSystem)
- [tuckn/WshProcess](https://github.com/tuckn/WshProcess)
- [tuckn/WshChildProcess](https://github.com/tuckn/WshChildProcess)
- [tuckn/WshNet](https://github.com/tuckn/WshNet)

## Documentation

See all specifications [here](https://docs.tuckn.net/WshZLIB) and also below.

- [WshPolyfill](https://docs.tuckn.net/WshPolyfill)
- [WshUtil](https://docs.tuckn.net/WshUtil)
- [WshPath](https://docs.tuckn.net/WshPath)
- [WshOS](https://docs.tuckn.net/WshOS)
- [WshFileSystem](https://docs.tuckn.net/WshFileSystem)
- [WshProcess](https://docs.tuckn.net/WshProcess)
- [WshChildProcess](https://docs.tuckn.net/WshChildProcess)
- [WshNet](https://docs.tuckn.net/WshNet)

## License

MIT

Copyright (c) 2022 [Tuckn](https://github.com/tuckn)
