/*
 * Helma License Notice
 *
 * The contents of this file are subject to the Helma License
 * Version 2.0 (the "License"). You may not use this file except in
 * compliance with the License. A copy of the License is available at
 * http://adele.helma.org/download/helma/license.txt
 *
 * Copyright 1998-2007 Helma Software. All Rights Reserved.
 *
 * $RCSfile: File.js,v $
 * $Author: zumbrunn $
 * $Revision: 8714 $
 * $Date: 2007-12-13 13:21:48 +0100 (Don, 13 Dez 2007) $
 */

export("File");

/**
 * @fileoverview Default properties and methods of the File prototype.
 */

/**
 * Constructor for File objects, providing read and 
 * write access to the file system.
 * @class This class represents a local file or directory 
 * @param {String|java.io.File} path as String, can be either absolute or relative
 *        to the ringo home directory
 * @constructor
 */
function File(path) {
   var JFile                     = java.io.File;
   var Writer                    = java.io.Writer;
   var FileReader                = java.io.FileReader;
   var BufferedReader            = java.io.BufferedReader;
   var PrintWriter               = java.io.PrintWriter;
   var FileOutputStream          = java.io.FileOutputStream;
   var OutputStreamWriter        = java.io.OutputStreamWriter;
   var FileInputStream           = java.io.FileInputStream;
   var InputStreamReader         = java.io.InputStreamReader;
   var FilenameFilter            = java.io.FilenameFilter;
   var EOFException              = java.io.EOFException;
   var IllegalStateException     = java.lang.IllegalStateException;
   var IllegalArgumentException  = java.lang.IllegalArgumentException

   var self = this;

   var file;
   try {
      if (arguments.length > 1) {
         file = new JFile(path, arguments[1]);
      } else if (!(path instanceof JFile)) {
         file = new JFile(path);
      } else {
         file = path;
      }
      if (!file.isAbsolute()) {
         // immediately convert to absolute path - java.io.File is
         // incredibly stupid when dealing with relative file names
         file = file.getAbsoluteFile();
      }
   } catch (e) {
      throw(e);
   }

   var readerWriter;
   var atEOF = false;
   var lastLine = null;

   /** @ignore */
   this.toString = function() {
      return file.toString();
   };

   /**
    * Returns the name of the file or directory represented by this File object.
    * <br /><br />
    * This is just the last name in the pathname's name sequence. 
    * If the pathname's name sequence is empty, then the empty 
    * string is returned.
    * 
    * @returns String containing the name of the file or directory
    * @type String
    */
   this.getName = function() {
      var name = file.getName();
      return (name == null ? "" : name);
   };

   /**
    * Returns true if the file represented by this File object
    * is currently open.
    * 
    * @returns Boolean
    * @type Boolean
    */
   this.isOpen = function() {
      return (readerWriter != null);
   };

    /**
     * Opens the file represented by this File object. If the file exists,
     * it is used for reading, otherwise it is opened for writing.
     * If the encoding argument is specified, it is used to read or write
     * the file. Otherwise, the platform's default encoding is used.
     *
     * @param {Object} options an optional argument holder object.
     *  The following options are supported:
     *  <ul><li>charset name of encoding to use for reading or writing</li>
     *  <li>append whether to append to the file if it exists</li></ul>
     * @returns Boolean true if the operation succeeded
     * @type Boolean
     */
    this.open = function(options) {
       if (self.isOpen()) {
          throw new IllegalStateException("File already open");
       }
       // We assume that the BufferedReader and PrintWriter creation
       // cannot fail except if the FileReader/FileWriter fails.
       // Otherwise we have an open file until the reader/writer
       // get garbage collected.
       var charset = options && options.charset;
       var append = options && options.append;
       if (file.exists() && !append) {
          if (charset) {
             readerWriter = new BufferedReader(
                new InputStreamReader(new FileInputStream(file), charset));
          } else {
             readerWriter = new BufferedReader(new FileReader(file));
          }
       } else {
          if (append && charset)  {
             readerWriter = new PrintWriter(
                     new OutputStreamWriter(new FileOutputStream(file, true), charset));
          } else if (append) {
             readerWriter = new PrintWriter(
                     new OutputStreamWriter(new FileOutputStream(file, true)));
          } else if (charset) {
             readerWriter = new PrintWriter(file, charset);
          } else {
             readerWriter = new PrintWriter(file);
          }
       }
       return true;
    };

   
   /**
    * Tests whether the file or directory represented by this File object exists.
    * 
    * @returns Boolean true if the file or directory exists; false otherwise
    * @type Boolean
    */
   this.exists = function() {
      return file.exists();
   };

   /**
    * Returns the pathname string of this File object's parent directory.
    * 
    * @returns String containing the pathname of the parent directory
    * @type String
    */
   this.getParent = function() {
      if (!file.getParent())
         return null;
      return new File(file.getParent());
   };

   /**
    * This methods reads characters until an end of line/file is encountered 
    * then returns the string for these characters (without any end of line 
    * character).
    * 
    * @returns String of the next unread line in the file
    * @type String
    */
   this.readln = function() {
      if (!self.isOpen()) {
         throw new IllegalStateException("File not opened");
      }
      if (!(readerWriter instanceof BufferedReader)) {
         throw new IllegalStateException("File not opened for reading");
      }
      if (atEOF) {
         throw new EOFException();
      }
      var line;
      if (lastLine != null) {
         line = lastLine;
         lastLine = null;
         return line;
      }
      // Here lastLine is null, return a new line
      line = readerWriter.readLine();
      if (line == null) {
         atEOF = true;
         throw new EOFException();
      }
      return line;
   };

   /**
    * Appends a string to the file represented by this File object.
    * 
    * @param {String} what as String, to be written to the file
    * @returns Boolean
    * @type Boolean
    * @see #writeln
    */
   this.write = function(what) {
      if (!self.isOpen()) {
         throw new IllegalStateException("File not opened");
      }
      if (!(readerWriter instanceof PrintWriter)) {
         throw new IllegalStateException("File not opened for writing");
      }
      if (what != null) {
         readerWriter.print(what.toString());
      }
      return true;
   };

   /**
    * Appends a string with a platform specific end of 
    * line to the file represented by this File object.
    * 
    * @param {String} what as String, to be written to the file
    * @returns Boolean
    * @type Boolean
    * @see #write
    */
   this.writeln = function(what) {
      if (self.write(what)) {
         readerWriter.println();
         return true;
      }
      return false;
   };

   /**
    * Tests whether this File object's pathname is absolute. 
    * <br /><br />
    * The definition of absolute pathname is system dependent. 
    * On UNIX systems, a pathname is absolute if its prefix is "/". 
    * On Microsoft Windows systems, a pathname is absolute if its prefix 
    * is a drive specifier followed by "\\", or if its prefix is "\\".
    * 
    * @returns Boolean if this abstract pathname is absolute, false otherwise
    * @type Boolean
    */
   this.isAbsolute = function() {
      return file.isAbsolute();
   };

   /**
    * Deletes the file or directory represented by this File object.
    * 
    * @returns Boolean
    * @type Boolean
    */
   this.remove = function() {
      if (self.isOpen()) {
         throw new IllegalStateException("An openened file cannot be removed");
      }
      return file["delete"]();
   };

   /**
    * List of all files within the directory represented by this File object.
    * <br /><br />
    * You may pass a RegExp Pattern to return just files matching this pattern.
    * <br /><br />
    * Example: var xmlFiles = dir.list(/.*\.xml/);
    * 
    * @param {RegExp} pattern as RegExp, optional pattern to test each file name against
    * @returns Array the list of file names
    * @type Array
    */
   this.list = function(pattern) {
      if (self.isOpen())
         return null;
      if (!file.isDirectory())
         return null;
      if (pattern) {
         return file.list(new FilenameFilter({
            accept: function(dir, name) {
               return pattern.test(name);
            }
         }));
      }
      return file.list();   
   };

   /**
    * List of all files within the directory represented by this File object.
    * <br /><br />
    * You may pass a RegExp Pattern to return just files matching this pattern.
    * <br /><br />
    * Example: var xmlFiles = dir.list(/.*\.xml/);
    *
    * @param {RegExp} pattern as RegExp, optional pattern to test each file name against
    * @returns Array the list of File objects
    * @type Array
    */
   this.listFiles = function(pattern) {
      if (self.isOpen() || !file.isDirectory())
         return null;
      // map function to convert java.io.Files to ringo Files
      function convert(jfile) {
         return new File(jfile);
      }
      if (pattern) {
         return file.listFiles(new FilenameFilter({
            accept: function(dir, name) {
               return pattern.test(name);
            }
         })).map(convert);
      }
      return file.listFiles().map(convert);
   }

   /**
    * Purges the content of the file represented by this File object.
    * 
    * @returns Boolean
    * @type Boolean
    */
   this.flush = function() {
      if (!self.isOpen()) {
         throw new IllegalStateException("File not opened");
      }
      if (readerWriter instanceof Writer) {
         readerWriter.flush();
      } else {
         throw new IllegalStateException("File not opened for write");
      }
      return true;
   };

   /**
    * Closes the file represented by this File object.
    * 
    * @returns Boolean
    * @type Boolean
    */
   this.close = function() {
      if (!self.isOpen()) {
         return false;
      }
      readerWriter.close();
      readerWriter = null;
      atEOF = false;
      lastLine = null;
      return true;
   };

   /**
    * Returns the pathname string of this File object. 
    * <br /><br />
    * The resulting string uses the default name-separator character 
    * to separate the names in the name sequence.
    * 
    * @returns String of this file's pathname
    * @type String
    */
   this.getPath = function() {
      var path = file.getPath();
      return (path == null ? "" : path);
   };

   /**
    * Tests whether the application can read the file 
    * represented by this File object.
    * 
    * @returns Boolean true if the file exists and can be read; false otherwise
    * @type Boolean
    */
   this.canRead = function() {
      return file.canRead();
   };

   /**
    * Tests whether the file represented by this File object is writable.
    * 
    * @returns Boolean true if the file exists and can be modified; false otherwise.
    * @type Boolean
    */
   this.canWrite = function() {
      return file.canWrite();
   };

   /**
    * Returns the absolute pathname string of this file.
    * <br /><br />
    * If this File object's pathname is already absolute, then the pathname 
    * string is simply returned as if by the getPath() method. If this 
    * abstract pathname is the empty abstract pathname then the pathname 
    * string of the current user directory, which is named by the system 
    * property user.dir, is returned. Otherwise this pathname is resolved 
    * in a system-dependent way. On UNIX systems, a relative pathname is 
    * made absolute by resolving it against the current user directory. 
    * On Microsoft Windows systems, a relative pathname is made absolute 
    * by resolving it against the current directory of the drive named by 
    * the pathname, if any; if not, it is resolved against the current user 
    * directory.
    * 
    * @returns String The absolute pathname string
    * @type String
    */
   this.getAbsolutePath = function() {
      var absolutPath = file.getAbsolutePath();
      return (absolutPath == null ? "" : absolutPath);
   };

   /**
    * Returns the length of the file represented by this File object. 
    * <br /><br />
    * The return value is unspecified if this pathname denotes a directory.
    * 
    * @returns Number The length, in bytes, of the file, or 0L if the file does not exist
    * @type Number
    */
   this.getLength = function() {
      return file.length();
   };

   /**
    * Tests whether the file represented by this File object is a directory.
    * 
    * @returns Boolean true if this File object is a directory and exists; false otherwise
    * @type Boolean
    */
   this.isDirectory = function() {
      return file.isDirectory();
   };

   /**
    * Tests whether the file represented by this File object is a normal file. 
    * <br /><br />
    * A file is normal if it is not a directory and, in addition, satisfies 
    * other system-dependent criteria. Any non-directory file created by a 
    * Java application is guaranteed to be a normal file.
    * 
    * @returns Boolean true if this File object is a normal file and exists; false otherwise
    * @type Boolean
    */
   this.isFile = function() {
      return file.isFile();
   };

   /**
    * Tests whether the file represented by this File object is a hidden file.
    * <br /><br />
    * What constitutes a hidden file may depend on the platform we are running on.
    *
    * @returns Boolean true if this File object is hidden
    * @type Boolean
    */
   this.isHidden = function() {
      return file.isHidden();
   };

   /**
    * Returns the time when the file represented by this File object was last modified.
    * <br /><br />
    * A number representing the time the file was last modified, 
    * measured in milliseconds since the epoch (00:00:00 GMT, January 1, 1970), 
    * or 0L if the file does not exist or if an I/O error occurs.
    * 
    * @returns Number in milliseconds since 00:00:00 GMT, January 1, 1970
    * @type Number
    */
   this.lastModified = function() {
      return file.lastModified();
   };

   /**
    * Creates the directory represented by this File object.
    * 
    * @returns Boolean true if the directory was created; false otherwise
    * @type Boolean
    */
   this.makeDirectory = function() {
      if (self.isOpen())
         return false;
      // don't do anything if file exists or use multi directory version
      return (file.isDirectory() || file.mkdirs());
   };

   /**
    * Renames the file represented by this File object.
    * <br /><br />
    * Whether or not this method can move a file from one 
    * filesystem to another is platform-dependent. The return 
    * value should always be checked to make sure that the 
    * rename operation was successful. 
    * 
    * @param {File} toFile File object containing the new path
    * @returns true if the renaming succeeded; false otherwise
    * @type Boolean
    */
   this.renameTo = function(toFile) {
      if (toFile == null) {
         throw new IllegalArgumentException("Uninitialized target File object");
      }
      if (self.isOpen()) {
         throw new IllegalStateException("An openened file cannot be renamed");
      }
      if (toFile.isOpen()) {
         throw new IllegalStateException("You cannot rename to an openened file");
      }
      return file.renameTo(new JFile(toFile.getAbsolutePath()));
   };

   /**
    * Returns true if the file represented by this File object
    * has been read entirely and the end of file has been reached.
    * 
    * @returns Boolean
    * @type Boolean
    */
   this.eof = function() {
      if (!self.isOpen()) {
         throw new IllegalStateException("File not opened");
      }
      if (!(readerWriter instanceof BufferedReader)) {
         throw new IllegalStateException("File not opened for read");
      }
      if (atEOF)  {
         return true;
      } else if (lastLine != null) {
         return false;
      }
      lastLine = readerWriter.readLine();
      if (lastLine == null)
         atEOF = true;
      return atEOF;
   };

   /**
    * This methods reads all the lines contained in the 
    * file and returns them.
    * 
    * @returns String of all the lines in the file
    * @type String
    */
   this.readAll = function() {
      // Open the file for readAll
      if (self.isOpen()) {
         throw new IllegalStateException("File already open");
      }
      if (file.exists()) {
         readerWriter = new BufferedReader(new FileReader(file));
      } else {
         throw new IllegalStateException("File does not exist");
      }
      if (!file.isFile()) {
         throw new IllegalStateException("File is not a regular file");
      }
      
         // read content line by line to setup proper eol
      var buffer = new java.lang.StringBuffer(file.length() * 1.10);
      while (true) {
         var line = readerWriter.readLine();
         if (line == null)
            break;
         if (buffer.length() > 0)
            buffer.append("\n");  // EcmaScript EOL
         buffer.append(line);
      }
     
         // Close the file
      readerWriter.close();
      readerWriter = null;
      return buffer.toString();
   };


   /**
    * This method removes a directory recursively .
    * <br /><br />
    * DANGER! DANGER! HIGH VOLTAGE!
    * The directory is deleted recursively without 
    * any warning or precautious measures.
    */
   this.removeDirectory = function() {
      if (!file.isDirectory())
         return false;
      var arr = file.list();
      for (var i=0; i<arr.length; i++) {
         var f = new File(file, arr[i]);
         if (f.isDirectory())
            f.removeDirectory();
         else
            f.remove();
      }
      file["delete"]();
      return true;
   };

   /**
    * Recursivly lists all files below a given directory
    * you may pass a RegExp Pattern to return just
    * files matching this pattern.
    * 
    * @param {RegExp} pattern as RegExp, to test each file name against
    * @returns Array the list of absolute file paths
    */
   this.listRecursive = function(pattern) {
      if (!file.isDirectory())
         return false;
      var result;
      if (!pattern || pattern.test(file.getName()))
         result = [file.getAbsolutePath()];
      else
         result = [];
      var arr = file.list();
      for (var i=0; i<arr.length; i++) {
         var f = new File(file, arr[i]);
         if (f.isDirectory())
            result = result.concat(f.listRecursive(pattern));
         else if (!pattern || pattern.test(arr[i]))
            result.push(f.getAbsolutePath());
      }
      return result;
   }

   /**
    * Makes a copy of a file or directory, possibly over filesystem borders.
    * 
    * @param {String|ringo.File} dest as a File object or the String of
    *        full path of the new file
    */
   this.hardCopy = function(dest) {
      if (this.isDirectory()) {
         if (typeof dest == "string") {
            dest = new File(dest);
         }
         if (!dest.exists() && !dest.makeDirectory()) {
            throw new Error("Could not create directory " + dest);
         }
         for each (var f in this.listFiles()) {
            f.hardCopy(new File(dest, f.getName()));
         }
      } else {
         var inStream = new java.io.BufferedInputStream(
            new java.io.FileInputStream(file)
         );
         var outStream = new java.io.BufferedOutputStream(
            new java.io.FileOutputStream(dest)
         );
         var buffer = java.lang.reflect.Array.newInstance(
            java.lang.Byte.TYPE, 4096
         );
         var bytesRead = 0;
         while ((bytesRead = inStream.read(buffer, 0, buffer.length)) != -1) {
            outStream.write(buffer, 0, bytesRead);
         }
         inStream.close();
         outStream.close();
      }
      return true;
   }

   /**
    * Create a new empty temporary file in the this directory, or in the directory
    * containing this file.
    * @param {String} prefix the prefix of the temporary file; must be at least three characters long
    * @param {String} suffix the suffix of the temporary file; may be null
    * @returns {File} the temporary file
    */
   this.createTempFile = function(prefix, suffix) {
      var dir = this.isDirectory() ? file : file.getParentFile();
      return new File(JFile.createTempFile(prefix, suffix, dir));
   }

   /**
    * Moves a file to a new destination directory.
    * 
    * @param {String} dest as String, the full path of the new file
    * @returns Boolean true in case file could be moved, false otherwise
    */
   this.move = function(dest) {
      // instead of using the standard File method renameTo()
      // do a hardCopy and then remove the source file. This way
      // file locking shouldn't be an issue
      self.hardCopy(dest);
      // remove the source file
      file["delete"]();
      return true;
   }

   /**
    * Returns file as ByteArray.
    * <br /><br />
    * Useful for passing it to a function instead of an request object.
    */
   this.toByteArray = function() {
      if (!this.exists())
         return null;
      var body = new java.io.ByteArrayOutputStream();
      var stream = new java.io.BufferedInputStream(
         new java.io.FileInputStream(this.getAbsolutePath())
      );
      var buf = java.lang.reflect.Array.newInstance(
         java.lang.Byte.TYPE, 1024
      );
      var read;
      while ((read = stream.read(buf)) > -1)
         body.write(buf, 0, read);
      stream.close();
      return body.toByteArray();
   };

   /**
    * Define iterator to loop through the lines of the file for ordinary files,
    * or the names of contained files for directories.
    *
    *   for each (var line in file) ...
    *
    *   for each (var filename in dir) ...
    */
   this.__iterator__ = function() {
      if (this.isDirectory()) {
         var files = this.list();
         for (var i = 0; i < files.length; i++) {
             yield files[i];
         }
      } else if (this.exists()) {
         if (this.open()) {
            try {
               while(true) {
                  yield this.readln();
               }
            } catch (e if e instanceof java.io.EOFException) {
               throw StopIteration;
            } finally {
               this.close();
            }
         }
      }
      throw StopIteration;
   }

   return this;
}


/** @ignore */
File.toString = function() {
   return "[ringo.File]";
};


File.separator = java.io.File.separator;

/**
 * Create a new empty temporary file in the default temporary-file directory.
 * @param {String} prefix the prefix of the temporary file; must be at least three characters long
 * @param {String} suffix the suffix of the temporary file; may be null
 * @returns {File} the temporary file
 */
File.createTempFile = function(prefix, suffix) {
   return new File(java.io.File.createTempFile(prefix, suffix));
}


