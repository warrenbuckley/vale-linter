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

# Super secret MOVE to Azure config of WebApp hosting this
###########################################################################################
ENV WEBHOOK_PROXY_URL="https://smee.io/4ua5haqQwvlVly4g"
ENV APP_ID=32862
ENV PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA1eUJT275ivicoSytiyjamLnjuAD+IeSZUHVmooU92gZZdCPO\nH97CwV1ao/3rbqiYn6SYOMgrqmm7fLx6p6mE2KvyQv4kyzNls0nWTR5IaaO3fHmi\naUAqaK8ZqmOan8edfeDp5Y7GR+Cmk58BTBcSXXln274bo7CMb5HoCgBXZ27kA/Hi\nLiJdJ7T5nmrdOUW2BwI5oz8LMKaXL8b+QcA11zqhfe0g5ZoJzhz0PbFFkGFzEi/c\nOm5NjweHTQPyz/WtQ7n/KaKPCDZwRGq3JoSGKaYGocG479oZh7DuoOqSdSDamfea\n0SWA3zNV0P0ijJDQP9vmQnQk5UPprcKNpvXkAQIDAQABAoIBACTYHB9ztUaMBqb4\nxDgZZHY0ZxZ2DVCXSRWD85cBLqNUvqnz1PjGbXPTed6PybM5FXlCZ/o3+NWU+vfE\nm7gvyjNsgwGpN3tNMjKNAH4uPjj8O4oUhbZtmCCKMPiZybPGNcnOKVwimOMevnLl\nS9roioBRfmNqvuYWbkp1rquyXVvyfGNqYMZyeip3T2bT7akKQFtBOWxB2LLWattJ\nftvY97I9i44k3CE7A80Eu0giowUtXeTuXa7XaO9uGO56YBXoJVOaxsHb2+kTOaCP\nEQ9m3b+NrZ9kynIJ1rlxuG9tz35AMCy4Z8Gx2ReCFGYnOfmFGJJwfU3q23VhflFI\nMhCruKUCgYEA87yqk5H0iC/HMKgGaxu/hYHtr9jgo3vJU5nQFy15f7y7ZCYlgg0i\niuWFwxNhhqFLCeggqaOBXRgEZwzsBPcbXgrZMo/CWysPEwAntzDjEQaFO28wMj43\nsmGICrDZ35wWr3oogFcWVAXJbdBDzyul+9ntpefyp3nQ/TgxqhegAjcCgYEA4KgA\nQYG7Y+E9uWcoRdP2UWmgwdB2d2Ioq/l2gKPB1bXfvBGV0NLRIxDxh7nnXD+DjaUN\nnnWFMobFni9fpLrvx3vRcFBvEpNcI+vrVuRrqhndwbeJY4acGqc/3WdFuBW1MDS6\nBpY7pka2cWt5CJ5TKgluFk0fbSHdA2QGamZoj4cCgYAk/HdCB378/4sRhh3bOQ26\nG7pO2fFUvZ8ScZ/TNJJgYOpqyyMb9hRM0YGX1aQSAv3ZFgGG3Inv74oTfTF/m2Pq\nxGirNIeAwCr8biSYtvFuDvg+yaOdrDVVe1lije2x8gS7QiVNPGnl/C7R3C2+DViV\nvD9E0srOwTyGgHWA4y7jxwKBgQDejS9rtXQItwqpj4qy2g7qicRKHBQvohr+equt\nNgyAhKK2sYkDjMTHgzJyLXUHypetCzRZpLwl2KMOWIncK5/7sypApD3UXgzqPP0v\nYCtUIDmxfPtqj+A2+zZmQ7cqbL7ImYMroUpIJ0b3Ruto4UcrnpnjF9WpC+HhSQae\nAwNUIwKBgQDVacwobZEStMktw0byRpDWc6GlSti0da6FbOrtOv0lBLQ5+CMcq1+8\nSx1fOhDYvKZVkzWXH7ohPQVlTv5tchXv116YR/9T1pXVE+ldQ0GsWC6X9rG7bxW/\nPtQlAtCFkRz3y4RU0LzNyJRjueOGSOOPiiu1i6t3tQz/UXlMeslUJQ==\n-----END RSA PRIVATE KEY-----\n"
ENV WEBHOOK_SECRET="500eee61ec878af0b65941bd761fe699b10fa1bb"
###########################################################################################

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