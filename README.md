# TeamSpeak (3) Server Status
A status api/page for TS3 servers, utilizing node.js and the TeamSpeak 3 Server query connection.

- [TeamSpeak ServerQuery Manual](http://media.teamspeak.com/ts3_literature/TeamSpeak%203%20Server%20Query%20Manual.pdf)

## Running project
You need to have installed NodeJS.

### Install dependencies 
To work, the config.js file must be adjusted.
```
serverHost: "server ip or hostname",            // TeamSpeak Server Hostname
serverPort: 10011,                              // TeamSpeak ServerQuery port
serverVirt: 1,                                  // Use Virtual Server with SID 1

loginName: "serveradmin",                       // ServerQuery Username
loginPass: "query password",                    // ServerQuery Password

webPort: 8080,                                  // Webserver port
webHost: "localhost",                           // Webserver Hostname (default localhost/127.0.0.1)

webError: "https://5g5.net",                    // 404 Page redirect
```

### Install dependencies 
To install dependencies enter project folder and run following command:
```
npm install .
```

### Run server
To run:
```
node app.js
```

## URL Mapping
### API Endpoints
Full Channel Tree with user status (name, talking, muted)
```
/api/tree
```
Full Hostinfo (instance_uptime, host_timestamp_utc, virtualservers_running_total, virtualservers_total_maxclients, virtualservers_total_clients_online, virtualservers_total_channels_online, connection_filetransfer_bandwidth_sent, connection_filetransfer_bandwidth_received, connection_filetransfer_bytes_sent_total, connection_filetransfer_bytes_received_total, connection_packets_sent_total, connection_bytes_sent_total, connection_packets_received_total, connection_bytes_received_total, connection_bandwidth_sent_last_second_total, connection_bandwidth_sent_last_minute_total, connection_bandwidth_received_last_second_total, connection_bandwidth_received_last_minute_total)
```
/api/hostinfo
```
Server Name (name)
```
/api/servername
```
Usercounter (useronline, totaluser)
```
/api/usercounter
```
### Simple (String Only)
useronline (useronline simple string)
```
/api/simple/useronline
```
maxclients (maxclients simple string)
```
/api/simple/maxclients
```

## ToDo: Standalone Angular WebFrontEnd (developing in process)
### Feature ideas:
- right system/keys
- user list
- write api options (like channel create, change channel name...)
- Connecting some sort of database for storing data like:
    - History Usercounter
    - User Stats
    - ...