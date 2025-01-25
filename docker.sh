IMAGENAME="usb-power-commander-server"
CONTAINERNAME="${IMAGENAME}-container"
PORT="8888"

SCRIPT_DIR=$(realpath $(dirname "$0"))
VOLUMES="-v ${SCRIPT_DIR}/data:/usr/src/app/data \
"
DEPLOY=""
CAPS=""

function help() {
    echo "USB Power Commander Docker container:"
    echo ""
    echo "Arguments:"
    echo "      daemon    : Creates container and restarts it at boot"
    echo "      stop      : Stops the container"
    echo "      restart   : Restarts the container"
    echo "      log       : Shows Docker logs"
    echo "      help      : Display this help message"
    echo "Flags:"
    echo "      -p|--port : Change the port the container listens on"
    echo ""
}

function print() {
    printf "\033[1m\033[38;5;27m$1\033[0m"
}

function run() {
    # Start the long-running command in the background
    eval "$@" > /dev/null 2>&1 &
    cmd_pid=$!

    printf "\033[38;5;27m"

    while kill -0 $cmd_pid 2>/dev/null; do
        printf "."
        sleep 1
    done

    if ! wait $cmd_pid > /dev/null 2>&1; then
        printf "\033[0;31mError"
    fi

    printf "\033[0m\n"
}

BUILD=FALSE
STOP=FALSE
LOG=FALSE
DAEMON=FALSE
if [ ! $# -gt 0 ]; then
    help
    exit 1
fi
while [[ $# -gt 0 ]]; do
    case "$1" in
        -h|--help|help)
            help
            exit 0
        ;;
        stop)
            STOP=TRUE
            shift
        ;;
        restart)
            STOP=TRUE
            BUILD=TRUE
            shift
        ;;
        start)
            BUILD=TRUE
            shift
        ;;
        daemon)
            BUILD=TRUE
            DAEMON=TRUE
            shift
        ;;
        log|logs)
            LOG=TRUE
            shift
        ;;
        -p|--port)
            PORT=$2
            shift
            shift
        ;;
        *)
            echo "Unknown option: $1"
            help
            exit 1
        ;;
    esac
done

if grep -q "Raspberry Pi" /proc/cpuinfo; then
    print "Running on a Raspberry Pi\n"
    DEPLOY="deploy"
    PORT=80

    # may need --privileged
    CAPS="--cap-add SYS_RAWIO" 
fi

if [ $STOP == TRUE ]; then
    print "Stopping container"
    run "docker stop $CONTAINERNAME; docker rm $CONTAINERNAME"
fi

if [ $BUILD == TRUE ]; then
    print "Building container"
    run docker build -t $IMAGENAME .
fi

if [ $DAEMON == TRUE ]; then
    print "Starting daemon container"
    run docker run $CAPS -d $VOLUMES -p $PORT:8888 --restart always --name "$CONTAINERNAME" "$IMAGENAME" $DEPLOY
elif [ $BUILD = TRUE ]; then
    print "Starting container"
    run docker run $CAPS -d $VOLUMES -p $PORT:8888 --name "$CONTAINERNAME" "$IMAGENAME" $DEPLOY
fi

if [ $LOG == TRUE ]; then
    print "Showing logs\n"
    docker logs -f "$CONTAINERNAME"
fi

print "Container running on port $PORT\n"