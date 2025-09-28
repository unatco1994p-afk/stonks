* Build
docker build -t stonks .

* Run
docker run --name stonks-backend -p 8080:8080 --env-file dev.env stonks
docker run --rm -it -p 8080:8080 --env-file dev.env stonks