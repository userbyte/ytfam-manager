# ytfam-manager setup

### you need a MongoDB server setup before you begin, so go do that if you dont have one already

## docker (recommended)

### server setup

_if you don't have docker installed yet, go install it then come back
**you also need a mongodb server!**_

**pull the [image](https://hub.docker.com/r/userbyte/ytmgr)**

```sh
docker pull userbyte/ytmgr:latest
```

**create the container**

```sh
# change these things:
#     $NAME :: desired container and volume docker name
#     $PORT :: the port you want ytmgr to be exposed on
#    $MONGO :: URI for your MongoDB instance (ex. mongodb://127.0.0.1:27017)
#   $SECRET :: some super incredibly secret string
export NAME="ytmgr";
export MONGO="...";
export SECRET="...";
docker create --env MONGO_URI=$MONGO --env JOB_SECRET=$SECRET --name $NAME --network=host --restart always userbyte/ytmgr:latest
```

**start the container**

```sh
docker start $NAME
```

[jump to last section](#both-node-and-docker)

---

## node (lil more complicated)

### server setup

_if you don't have node, npm, and yarn installed yet, go install em then come back_

**clone this github repo**

```sh
git clone https://github.com/userbyte/ytmgr
cd ytmgr
```

**install dependencies**

```sh
yarn install # or npm install
```

**set the `MONGO_URI` and `JOB_SECRET` environment variables (required) ⚠**

_[spoooky secret generator api](https://api.stringgy.com/?length=30&amount=1&type=ALLNOSYMBOLS)_

```sh
# .env
MONGO_URI="mongodb://..."
JOB_SECRET="something_secret"
```

**build**

```sh
yarn run build # or npm run dev
```

**start**

```sh
node .next/standalone/server.js
```

[jump to last section](#both-node-and-docker)

---

# automatic jobs

**this application requires an external service to trigger its jobs**

you can set this up in a number of ways, but the easiest is probably a cron job.

there is a `run-job.sh` script included in this repo. this script simply triggers the jobs for you, and you can set them to run twice a day (recommended) via cron like this:

_important:_<br/>
_\*replace /path/to/ with actual path to dir where run-job.sh lives_<br/>
_\*set the job secret env var to the one you set earlier_

```
0 */12 * * * JOB_SECRET="..." bash /path/to/run-job.sh renewals
0 */12 * * * JOB_SECRET="..." bash /path/to/run-job.sh payments
```
