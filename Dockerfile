# The base image we want to use
# It's a linux distro with Node pre-installed (26MB)
FROM node:10.16

# Download Go
RUN wget https://dl.google.com/go/go1.12.2.linux-amd64.tar.gz

# Unpack tar file
RUN tar -xvf go1.12.2.linux-amd64.tar.gz

# Move unpacked go directory to /usr/local
RUN mv go /usr/local

# Set env variable for where GO binary tool is
ENV GOROOT=/usr/local/go

# Set env variable for where GO will download & install GO packages
ENV GOPATH=$HOME/go

# Put GO into the PATH so typing go from command line will work
ENV PATH=$PATH:$GOROOT/bin

# install the VALE linting tool from GitHub as a GO package
RUN go get github.com/errata-ai/vale

# Set the /go/bin/vale into the path
ENV PATH=$PATH:/go/bin/

# Set the working directory in the image
# Used for COPY/RUN commands below...
WORKDIR /usr/src/app

# Copy package.json npm & stuff into image
COPY ["package.json", "package-lock.json*", "npm-shrinkwrap.json*", "./"]

# Do an NPM install
RUN npm install

# Copy everything over from current directory
# It will exclude files/directories that match in the .dockerignore file
COPY . .

# npm run build (Compile TypeScript)
# Not sure if npm install above wont be happy as dev-dependencies for compiling TypeScript
RUN npm run build

# Make port 3000 available
EXPOSE 3000

# Run command npm start - which boots up our ProBot app
# A simple NodeJS webserver that listens/respondes to WebHooks from GitHub
CMD npm start