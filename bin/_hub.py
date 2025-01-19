#!/usr/bin/env python3

import argparse
import requests

def send_command(url, action):
    # Construct the full URL and the payload
    full_url = f"http://{url}/config"
    response = requests.post(full_url, json=action)
    
    if response.status_code == 200:
        return response.json()  # Ensure the server sends back JSON for this to work
    else:
        print("Failed to send command")
        return None  # Explicitly return None if there is a failure

def main():
    # # Setup argument parser
    parser = argparse.ArgumentParser(description="Control Hub Ports via Command Line")
    # parser.add_argument('action', choices=['on', 'off', 'host'], help="Action to perform: 'on', 'off', or specify a host name")
    # parser.add_argument('port', help="Name of the port to control")
    parser.add_argument('--portNames', action='store_true', help="List all port names")
    parser.add_argument('--hostNames', action='store_true', help="List all host names")
    parser.add_argument('--status', action='store_true', help="get status of all ports")
    parser.add_argument('--url', default="localhost:8888", help="URL of the hub")
    parser.add_argument('--ports', nargs='+', help="Ports to control")
    parser.add_argument('--host', help="Host to control")
    args = parser.parse_args()

    url = args.url
    payload = {}
    hostNames = []
    portNames = []

    payload["portNames"] = {"get": {}}
    payload["hostNames"] = {"get": {}}
    if(args.status):
        payload["ports"] = {"get": {}}

    result = send_command(url, payload)
        
    if(result["success"]):
        if(args.portNames):
            for port in result["portNames"]["return"]:
                print(result["portNames"]["return"][port]["name"])
        else:
            for port in result["portNames"]["return"]:
                portNames.append(result["portNames"]["return"][port]["name"])
        if(args.hostNames):
            for host in result["hostNames"]["return"]:
                print(result["hostNames"]["return"][host]["name"])
        else:
            for host in result["hostNames"]["return"]:
                hostNames.append(result["hostNames"]["return"][host]["name"])

        if args.status:
            hosts = []
            for host in result["hostNames"]["return"]:
                hosts.append(result["hostNames"]["return"][host]["name"])

            # Determine the longest port name for formatting
            longest_port_name = max(len(result["portNames"]["return"][port]["name"]) for port in result["portNames"]["return"])
            longest_host_name = max(len(host) for host in hosts)

            for port in result["portNames"]["return"]:
                port_name = result["portNames"]["return"][port]["name"]
                select = result["ports"]["return"][port]['select']
                if not result["ports"]["return"][port]['enable']:
                    value = "\033[38;5;196mOFF"
                else:
                    if select == 0:
                        value = "\033[38;5;33m" + hosts[select]
                    else:
                        value = "\033[38;5;57m" + hosts[select]
                        
                value = "\033[1m"+ value + "\033[0m"

                print(f"{port_name:<{longest_port_name}}  : {value:<{longest_host_name}}")

        if args.host and args.ports:
            possibleHosts = []
            for host in result["hostNames"]["return"]:
                possibleHosts.append(result["hostNames"]["return"][host]["name"])
            possibleHosts.append("off")

            if(args.host not in possibleHosts):
                print(f"Host {args.host} not found")

            payload = {"ports": {"set": {}}}
            select = -1

            for port in args.ports:
                index = portNames.index(port)
                if args.host == "off":
                    payload["ports"]["set"][index] = {"enable": False}
                else:
                    select = possibleHosts.index(args.host)
                    payload["ports"]["set"][index] = {"enable": True, "select": select}
                    
            result = send_command(url, payload)

            if(result["success"]):
                for port in args.ports:
                    if args.host == "off":
                        value = "\033[38;5;196mOFF"
                    else:
                        if select == 0:
                            value = "\033[38;5;33m" + args.host
                        else:
                            value = "\033[38;5;57m" + args.host
                    value = "\033[1m"+ value + "\033[0m"

                    print(f"{port} : {value}")
            else:
                print("Failed to set port status")


if __name__ == "__main__":
    main()
