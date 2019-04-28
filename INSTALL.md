# Install Saito

## Dependencies
- Python 2.x

## Server Configuration (pre-install)

You should have a server with at least 2 GB of RAM and a reasonably 
up-to-date version of NodeJS and NPM installed. If you are setting
up a new server, we recommend using Ubuntu, which can be configured
to work out-of-the-box with Node v9 as follows:
```
apt-get update
apt-get install g++ make
curl -sL https://deb.nodesource.com/setup_9.x | sudo -E bash -
sudo apt-get install -y nodejs
```



## Step 1 - Google's Dense Hashmap implementation

Download Google's Dense Hashmap implementation:
```
git clone https://github.com/sparsehash/sparsehash
cd sparsehash
./configure
make
make install
```

If you cannot download this file, we have included a recent working
version inside the "extras" directory in this distribution. You can 
install it by entering the relevant directory and installing it:
```
cd extras/sparsehash/sparsehash
./configure
make
make install
```



## Step 2 - required NodeJS

Install required NodeJS dependencies:
```
npm install
```

If you run into any problems at this point please write us and let us
know and we'll figure out the problem and update this file. Otherwise
you should be ready to run Saito.



## Step 3 - Run Saito

Go into the directory where you installed Saito and type:

```
npm run nuke
```

This will "compile" the software, including the scripts that are fed-out
to browsers that connect to your machine. Once it is complete, you can 
run the software:

```
npm start
```

