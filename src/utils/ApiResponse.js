class ApiResponse {
    constructor(ststusCode, data, message = "success"){
        this.ststusCode = ststusCode
        this.data = data
        this.message = message
        this.success = ststusCode < 400
    }
}

export {ApiResponse};