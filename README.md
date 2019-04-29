# Welcome to Saito

## Getting started
If you just downloaded Saito and want to get it running, please read our 
[INSTALL file](INSTALL.md) instead of this one. This README contains more general
information that might be useful for developers getting started.



## Nuking versus Compiling
The two NPM commands can be used to "compile" a location Saito installation. The 
difference is that "nuking" an installation will wipe-out all existing blockchain
data and reset every single database. If you are just updating the source code of
a module, using "compile" will re-generate the javascript without deleting any
information.

```
./npm run nuke  (to purge all blockchain data)
./npm run compile  (to preserve blockchain data)
```


## For developers
Please see the INSTALL file for instructions on getting Saito running. 
Once the program is executing, you can connect to Saito through your 
browser:

http://localhost:12101

You can find the default start page for this webpage in our source code
directory at the following location. It is currently auto-generated from
the "welcome" module which can be found in the mods directory. Edits to 
the welcome module will persist across compilations.
```
lib/saito/web/index.html
```

Most of the user-driven functionality is coded in optional modules that 
create web applications. Our blockchain explorer, for instance, is just 
a regular Saito application module. The file that controls which modules 
are loaded by any server is:
```
lib/modules/mods.js
```

The modules themselves are contained in sub-directories within that 
directory. A good way to get familiar with Saito (and find out how it
works under the hood) is to look at these modules. Existing apps can 
act as simple tutorials on how to code your own applications.  

While we're testing our network, we will be changing the public keys
of both the Bank and Archive modules. To test these modules in development, make sure the keys are set to the following values:
- Bank:
```
this.bank_publickey = "nR2ecdN7cW91nxVaDR4uXqW35GbAdGU5abzPJ9PkE8Mn"
this.bank_privatekey = app.wallet.returnPrivateKey();
```
- Registry:
```
this.publickey = "nR2ecdN7cW91nxVaDR4uXqW35GbAdGU5abzPJ9PkE8Mn";
```
- Archive:
```
this.publickey = this.app.wallet.returnPublicKey();`
```

If you have any questions or need help please get in touch:  

* david@saito
* david@saito.tech
