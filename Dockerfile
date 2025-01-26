FROM node:latest
ENV TZ=America/New_York
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

WORKDIR /usr/src/app

# Install Git, build tools, and any other necessary packages
RUN apt-get update && apt-get install -y \
    cmake \
    device-tree-compiler \
    libfdt-dev \
    git \
    && rm -rf /var/lib/apt/lists/*

# Clone and build pinctrl
RUN git clone https://github.com/raspberrypi/utils.git /usr/src/pinctrl/

RUN mkdir -p /usr/src/pinctrl/pinctrl/build && \
    cd /usr/src/pinctrl/pinctrl/build && \
    cmake -S .. -B . && \
    make && \
    make install


COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 8888

ENTRYPOINT ["npm", "run"]
CMD ["start"]