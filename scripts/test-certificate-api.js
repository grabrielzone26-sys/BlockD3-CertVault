const axios = require('axios');
const fs = require('fs');

async function testCertificateIssuance() {
    try {
        // Login to get token
        console.log('Logging in...');
        const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
            email: 'admin@blockd3.com',
            password: 'admin123'
        });
        
        const token = loginResponse.data.token;
        console.log('Login successful, token received');
        
        // Read test certificate file
        const certificateFile = fs.readFileSync('test-certificate.pdf');
        const certificateBase64 = certificateFile.toString('base64');
        
        // Issue certificate
        console.log('Issuing certificate...');
        const certificateData = {
            studentId: 'TEST123',
            courseName: 'Bachelor of Computer Science',
            certificateFile: certificateBase64,
            metadata: {
                studentName: 'Test Student',
                graduationDate: '2024-05-15T00:00:00.000Z',
                program: 'Undergraduate',
                major: 'Computer Science',
                cgpa: 3.75,
                issueDate: new Date().toISOString()
            }
        };
        
        const response = await axios.post('http://localhost:5000/api/certificates', certificateData, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('Certificate issuance response:');
        console.log(JSON.stringify(response.data, null, 2));
        
        // Check if IPFS hash and transaction hash are present
        if (response.data.data.ipfsHash) {
            console.log('✅ IPFS hash present:', response.data.data.ipfsHash);
        } else {
            console.log('❌ IPFS hash missing');
        }
        
        if (response.data.data.transactionHash) {
            console.log('✅ Blockchain transaction hash present:', response.data.data.transactionHash);
        } else {
            console.log('❌ Blockchain transaction hash missing');
        }
        
    } catch (error) {
        console.error('Error:', error.response?.data || error.message);
    }
}

testCertificateIssuance();
