# Saito Installation

## Dependencies
- Python 2.x

## Server Configuration (pre-install)

You should have a server with at least 2 GB of RAM and a reasonably 
up-to-date version of NodeJS and NPM installed. If you are setting
up a new server, we recommend using Ubuntu, which can be configured
to work out-of-the-box with Node v9 as follows:

### Linux
```
apt-get update
apt-get install g++ make
curl -sL https://deb.nodesource.com/setup_9.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### Mac
We recommend getting [brew](https://brew.sh/) to install `node` on Mac
```
brew link node@10
brew install node
```

### Windows
Install Node.js through the website [here](https://nodejs.org/en/download/)

## Install Google's Dense Hashmap

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

## Install Saito

Clone Saito from the github repo:
```
git clone https://github.com/saitotech/saito
```

Change directory into `saito` and install required NodeJS dependencies:
```
npm install
```

If you run into any problems at this point please write us and let us
know and we'll figure out the problem and update this file. Otherwise
you should be ready to run Saito.


Run our `compile` script to refresh the software to a clean state:
```
npm run nuke
```

Then:
```
npm start
```

This will start a version of Saito running on LOCALHOST. When we launch
our testnet we will change this package to connect to testnet by default.
Until then, connecting to the testnet needs to be manually enabled, but
the local version can still be used for testing and app development.

If you wish to run Saito on a server and close your connection to the
server while continuing to run Saito in background mode, enter this
command instead:
```
npm run serve
```

Wait a few seconds after starting the program and type `Ctrl-C`. You
will see the `^C` carat printed at the terminal line but get no other
indications of change. You should then type `exit` to close your
terminal. Saito will continue to run in the background.

## Docker

Build your docker container locally, or pull from `beargy/saito`
```
docker build -t bearguy/saito .
```

Then run it with `docker-compose up` and go to `http://localhost:8080` to see your Saito instance