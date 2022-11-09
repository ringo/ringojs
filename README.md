# RingoJS

Ringo is a JavaScript platform built on the JVM and optimized for server-side applications.
It's based on the Mozilla Rhino JavaScript engine.

It adds a number of features to Rhino that make it suitable for real-world,
large-scale application development:

  * A fast, auto-reloading, and CommonJS-compliant module loader.
  * A rich set of modules covering I/O, logging, development tools
    and much more.
  * Support for blocking and non-blocking I/O.
  * Scalable HTTP server based on the Jetty project.
  * Support for CommonJS packages to install or write additional software
    components.

For more information, visit the RingoJS web site: <https://ringojs.org>

## Download and Installation

Download the latest precompiled release from the [download page](https://ringojs.org/download/). Extract the archive and add the `ringojs/bin` directory to your local `PATH` for convinience.

If you use the Homebrew package manager on MacOS, you can use the ringojs formula: `brew install ringojs`

Take a look at the [Getting Started Guide](https://ringojs.org/get_started/) on Ringo's website for more details
how to get started after you installed Ringo on your system.

### Verify releases

To verify the integrity of a downloaded binary distribution, use the associated checksum file:

```
$ grep ringojs-x.y.z.tar.gz SHASUMS256-x.y.z.txt | sha256sum -c -
```

#### Verifying the integrity of provided checksums

Releases of RingoJS will be signed with one of the following GPG keys:

* 3.0.0 and newer: Philipp Naderer-Puiu &lt;philipp@naderer-puiu.at&gt; <br> `1405 9F17 6485 6429 089F B423 6167 CFBB BDF2 A508`
* 2.0.0 and older: Philipp Naderer-Puiu &lt;philipp@naderer-puiu.at&gt; <br> `DE2A A9A1 B018 6C2F 622F  D9EF 3F47 C28B 23EB 3072`
* 1.2.0 and older: Philipp Naderer &lt;philipp.naderer@gmail.com&gt; <br> `8FF2 26B7 F268 547B 176F ABAC F312 313B 5CBC 0883`

All official releases will be signed by at least one published key.
Get the latest release key for 3.0.0 and newer with: 

```
$ gpg --keyserver hkps://keys.openpgp.org --recv-keys 14059F1764856429089FB4236167CFBBBDF2A508
```

Download the checksums `SHASUMS256.txt` and separate signature `SHASUMS256.txt.sig` for the release, e.g.

```
$ curl -LO https://github.com/ringo/ringojs/releases/download/v3.0.0/SHASUMS256-3.0.0.txt
$ curl -LO https://github.com/ringo/ringojs/releases/download/v3.0.0/SHASUMS256-3.0.0.txt.sig
```

Now verify the checksums with:

```
$ gpg --verify SHASUMS256-3.0.0.txt.sig
gpg: assuming signed data in 'SHASUMS256-3.0.0-RC6.txt'
gpg: Signature made Wed Feb 23 12:07:10 2022 CET
gpg:                using RSA key 14059F1764856429089FB4236167CFBBBDF2A508
gpg: Good signature from "Philipp Naderer-Puiu <philipp@naderer-puiu.at>" [ultimate]
```

## Building from Source
[![main](https://github.com/ringo/ringojs/actions/workflows/test-publish-main.yaml/badge.svg?branch=main)](https://github.com/ringo/ringojs/actions/workflows/test-publish-main.yaml)

Ringo runs on top of the Java Platform. You can use an open implementation like [Eclipse Temurin][EclipseTemurin] or [Oracle's distribution][OracleJava].
It uses [Gradle] as build tool.

[EclipseTemurin]: https://adoptium.net/ 
[OracleJava]: https://www.oracle.com/technetwork/java/javase/downloads/index.html
[Gradle]: https://gradle.org/

If you have these installed, building Ringo is straightforward:

Check out Ringo using Git:

    git clone git://github.com/ringo/ringojs.git

Change to the ringojs directory and run

    ./gradlew

## Supporters

### JetBrains

JetBrains sponsored an Open Source license for IntelliJ IDEA to create and maintain Ringo. Thanks for your continuous support!

<img src="https://ringojs.org/static/intellij.svg" height="70" alt="">

### ORF.at

A huge salute to ORF.at for supporting this projects over the years!

<img src="https://orf.at/mojo/1_4_1/storyserver//news/news/images/target_news.svg" height="65" alt="">
