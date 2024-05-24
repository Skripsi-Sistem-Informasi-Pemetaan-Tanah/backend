const httpStatus = {
    '200': 'Success',
    '400': 'Bad Request',
    '401': 'Unauthorized',
    '403': 'Forbidden',
    '404': 'Not Found',
    '500': 'Internal Server Error'
}

export const utilMessage = (res, code, message) => {
    const newStatus = httpStatus[code.toString()]
    return res.status(code).json({ code, status: newStatus, message })
}

export const utilData = (res, code, data) => {
    const newStatus = httpStatus[code.toString()]
    return res.status(code).json({ code, status: newStatus, data })
}

export const utilError = (res, error) => {
    const code = 500
    const newStatus = httpStatus[code.toString()]
    return res.status(500).json({
        code,
        status: newStatus,
        message: 'Terjadi kesalahan pada server',
        error: error.message
    })
}