

const { ReviewRestaurantToDelivery } = require('../models');

exports.create = async (req,res)=>{
  try{
    const review = await ReviewRestaurantToDelivery.create(req.body);
    res.status(201).json(review);
  }catch(e){ res.status(500).json({error:e.message}); }
};

exports.getAll = async (req,res)=>{
  try{
    const reviews = await ReviewRestaurantToDelivery.findAll();
    res.json(reviews);
  }catch(e){ res.status(500).json({error:e.message}); }
};

exports.getById = async (req,res)=>{
  try{
    const review = await ReviewRestaurantToDelivery.findByPk(req.params.id);
    if(!review) return res.status(404).json({error:"Not found"});
    res.json(review);
  }catch(e){ res.status(500).json({error:e.message}); }
};

exports.update = async (req,res)=>{
  try{
    const review = await ReviewRestaurantToDelivery.findByPk(req.params.id);
    if(!review) return res.status(404).json({error:"Not found"});
    await review.update(req.body);
    res.json(review);
  }catch(e){ res.status(500).json({error:e.message}); }
};

exports.delete = async (req,res)=>{
  try{
    const review = await ReviewRestaurantToDelivery.findByPk(req.params.id);
    if(!review) return res.status(404).json({error:"Not found"});
    await review.destroy();
    res.json({message:"Deleted"});
  }catch(e){ res.status(500).json({error:e.message}); }
};
