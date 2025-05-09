// middleware/authMiddleware.js
export async function merchantAuth(req, res, next) {
    try {
      const token = req.header('Authorization').replace('Bearer ', '');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findOne({ _id: decoded._id, 'tokens.token': token });
  
      if (!user) {
        throw new Error();
      }
  
      // Find the merchant profile and attach clinic ID
      const merchant = await Merchant.findOne({ user: user._id });
      if (!merchant) {
        throw new Error('Merchant profile not found');
      }
  
      req.token = token;
      req.user = user;
      req.merchant = {
        userId: user._id,
        clinicId: merchant._id  // Attach clinic ID here
      };
  
      next();
    } catch (err) {
      res.status(401).send({ error: 'Please authenticate as merchant.' });
    }
  }