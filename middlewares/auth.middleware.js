import jwt from 'jsonwebtoken';
import {prisma} from '../prisma/index.js'; // jwt 속 userId는 결국 db에 보관된 userId를 가져오는 것이기 때문에 그걸 가져오기 위해 prisma 클라이언트 대동


export default async function (req, res, next) {
    try {
    const { accessToken } = req.cookies;  // 우리가 만들어줬던 authorization을 cookies에 담아서 보내봐
    if (!accessToken) {
    return  res.status(401).json({ message : '이거 맞아?'})
    }  // 그거 맞아?

    const [tokenType, token] = accessToken.split(' ');    // authorization 토큰을 split을 이용해 두개로 분리하고, 분리된 것들은 각각 tokenType, token 으로 불린다.
    if (tokenType !== 'Bearer') throw new Error ('토큰 타입이 Bearer가 아닙니다.');
        // throw new Error를 쓰는 이유는 에러를 그때그때 처리 안하고 밑에 catch(error)로 throw(던져서) 한번에 처리할 것이기 때문이다.
    
    // access token 검증. 성공하면 decodedToken 실패하면 에러 아닙니까!
    const decodedToken = jwt.verify(token, 'custom-secret-key');    // 시크릿키로 형성된 token 부분을 검증한다. 유효기간도 verify 함수가 알아서 체크해준다.
    
    const userId = decodedToken.userId; // 검증된 토큰(decodedToken)속 userId
    
    // 검증된 토큰을 바탕으로 사용자 조회
    const user = await prisma.users.findFirst({
        where : { userId : +userId }     // 검증된 토큰속 userId인데 +를 붙여주어 문자열이더라도 숫자로 변환시킴
    })
    if (!user) {
        throw new Error('토큰 사용자가 존재하지 않습니다.');    // catch error로 에러 패스
    }
    req.user = user;
    next();         // req.locals.user에 검증 완료된 user를 담아 보낸다.

    } catch (error) {
        if (error.name === 'TokenEpiredError')
        return res.status(401).json({ message : '토큰이 만료되었습니다.' });
        if (error.name === 'JsonWebTokenError')
        return res.status(401).json({ message : '토큰이 이상합니다.'});
        return res.status(400).json({ message : error.message}); // 그때그때 발생되는 에러메세지를 그대로 메세지로 출력
    }
}