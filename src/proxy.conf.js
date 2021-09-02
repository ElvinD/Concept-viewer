const PROXY_CONFIG = [
    {
        context: [
            "/graphql",            
        ],
        target: "http://localhost:8083/tbl/graphql",
        secure: true,
        "changeOrigin": true,
        "pathRewrite": {
          "^/graphql": ""
        } 
    }
]

module.exports =  PROXY_CONFIG;