declare const Server: any;
declare const stdioTransport: any;
declare const echoTool: {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        required: string[];
        properties: {
            text: {
                type: string;
                description: string;
            };
        };
    };
};
declare const getTimeTool: {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            format: {
                type: string;
                description: string;
                enum: string[];
            };
        };
    };
};
declare const server: any;
