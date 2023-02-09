//
//  Copyright (c) <2014>, skysent
//  All rights reserved.
//
//  Redistribution and use in source and binary forms, with or without
//  modification, are permitted provided that the following conditions are met:
//  1. Redistributions of source code must retain the above copyright
//  notice, this list of conditions and the following disclaimer.
//  2. Redistributions in binary form must reproduce the above copyright
//  notice, this list of conditions and the following disclaimer in the
//  documentation and/or other materials provided with the distribution.
//  3. All advertising materials mentioning features or use of this software
//  must display the following acknowledgement:
//  This product includes software developed by skysent.
//  4. Neither the name of the skysent nor the
//  names of its contributors may be used to endorse or promote products
//  derived from this software without specific prior written permission.
//
//  THIS SOFTWARE IS PROVIDED BY skysent ''AS IS'' AND ANY
//  EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
//  WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
//  DISCLAIMED. IN NO EVENT SHALL skysent BE LIABLE FOR ANY
//  DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
//  (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
//  LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
//  ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
//  (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
//  SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
//

#include <stdio.h>
#include <stdlib.h>
#include <sys/socket.h>
#include <arpa/inet.h>
#include <sys/types.h>
#include <string.h>
#include <unistd.h>
#include <netdb.h>
#define yudpsocket_buff_len 8192

//return socket fd
int yudpsocket_server(const char *address, int port) {

    //create socket
    int socketfd=socket(AF_INET, SOCK_DGRAM, 0);
    int reuseon = 1;
    int r = -1;

    //bind
    struct sockaddr_in serv_addr;
    memset( &serv_addr, '\0', sizeof(serv_addr));
    serv_addr.sin_len = sizeof(struct sockaddr_in);
    serv_addr.sin_family = AF_INET;
    if (address == NULL || strlen(address) == 0 || strcmp(address, "255.255.255.255") == 0) {
        r = setsockopt(socketfd, SOL_SOCKET, SO_BROADCAST, &reuseon, sizeof(reuseon));
        serv_addr.sin_port = htons(port);
        serv_addr.sin_addr.s_addr = htonl(INADDR_ANY);
    } else {
        r = setsockopt(socketfd, SOL_SOCKET, SO_REUSEADDR, &reuseon, sizeof(reuseon));
        serv_addr.sin_addr.s_addr = inet_addr(address);
        serv_addr.sin_port = htons(port);
    }

    if (r == -1) {
       return -1;
    }

    r = bind(socketfd, (struct sockaddr *) &serv_addr, sizeof(serv_addr));
    if (r == 0) {
        return socketfd;
    } else {
        return -1;
    }
}

int yudpsocket_recive(int socket_fd, char *outdata, int expted_len, char *remoteip, int *remoteport) {
    struct sockaddr_in cli_addr;
    socklen_t clilen = sizeof(cli_addr);
    memset(&cli_addr, 0x0, sizeof(struct sockaddr_in));
    int len = (int)recvfrom(socket_fd, outdata, expted_len, 0, (struct sockaddr *)&cli_addr, &clilen);
    char *clientip = inet_ntoa(cli_addr.sin_addr);
    memcpy(remoteip, clientip, strlen(clientip));
    *remoteport = cli_addr.sin_port;

    return len;
}

int yudpsocket_close(int socket_fd) {
    return close(socket_fd);
}

//return socket fd
int yudpsocket_client(void) {
    //create socket
    int socketfd = socket(AF_INET, SOCK_DGRAM, 0);
    int reuseon = 1;
    setsockopt(socketfd, SOL_SOCKET, SO_REUSEADDR, &reuseon, sizeof(reuseon));

    //disable SIGPIPE as we'll handle send errors ourselves
    int noSigPipe = 1;
    setsockopt(socketfd, SOL_SOCKET, SO_NOSIGPIPE, &noSigPipe, sizeof(noSigPipe));

    return socketfd;
}

//enable broadcast
void enable_broadcast(int socket_fd) {
    int reuseon = 1;
    setsockopt(socket_fd, SOL_SOCKET, SO_BROADCAST, &reuseon, sizeof(reuseon));
}

int yudpsocket_get_server_ip(char *host, char *ip) {
    struct hostent *hp;
    struct sockaddr_in address;

    hp = gethostbyname(host);
    if (hp == NULL) {
        return -1;
    }

    bcopy((char *)hp->h_addr, (char *)&address.sin_addr, hp->h_length);
    char *clientip = inet_ntoa(address.sin_addr);
    memcpy(ip, clientip, strlen(clientip));

    return 0;
}

//send message to address and port
int yudpsocket_sentto(int socket_fd, char *msg, int len, char *toaddr, int topotr) {
    struct sockaddr_in address;
    socklen_t addrlen = sizeof(address);
    memset(&address, 0x0, sizeof(struct sockaddr_in));
    address.sin_family = AF_INET;
    address.sin_port = htons(topotr);
    address.sin_addr.s_addr = inet_addr(toaddr);
    int sendlen = (int)sendto(socket_fd, msg, len, 0, (struct sockaddr *)&address, addrlen);

    return sendlen;
}
