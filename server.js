//jshint esversion:6
const mysql =  require("mysql");
const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const moment = require('moment');

const admin = require('firebase-admin');
const serviceAccount = require("./helpers/serviceAccountKey.json");//Firebase NodeJs linking
const fs = require('fs');
app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));
app.use(bodyParser.json({ parameterLimit: 100000,limit: '2mb',extended: true }));


admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://tahfifaauthdb.firebaseio.com"
});






//Check if the user exists in firebase and if exists we create a custom token
app.get('/phone/:phoneID',(req,res)=>{

  const phoneID = req.params.phoneID;
  
  admin.auth().getUserByPhoneNumber(phoneID)
  .then(function(userRecord) {
    const uid = userRecord.uid;
    const expiresIn = 3600;
    
    if(uid){ 
      admin.auth().createCustomToken(uid)
        .then(function(customToken) {
          // Send token back to client
          const expirationDate= new Date(new Date().getTime() + expiresIn * 1000);
          const token= customToken;
          res.send({userRecord:userRecord.toJSON(),token:token,expirationDate:expirationDate});
          console.log(admin.auth().currentUser);
          console.log('Successfully fetched user data:', userRecord.toJSON());
        })
        .catch(function(error){
          console.log('Error creating custom token:', error);
        });
    }

    
  })
  .catch(function(error) {
    console.log('Error fetching user data:', error);
    res.send({userRecord:error});
  });

});

//Update firebase phone of an existing user

app.patch('/phoneUpdate/:uid',(req,res)=>{
admin.auth().updateUser(req.params.uid, {
  phoneNumber: req.body.phoneNumber,
})
  .then(function(userRecord) {
    // See the UserRecord reference doc for the contents of userRecord.
    console.log('Successfully updated user', userRecord.toJSON());
  })
  .catch(function(error) {
    console.log('Error updating user:', error);
  });

});

//Delete firebase user
app.delete('/userDelete/:uid',(req,res)=>{

  admin.auth().deleteUser(req.params.uid)
  .then(function() {
    console.log('Successfully deleted user');
  })
  .catch(function(error) {
    console.log('Error deleting user:', error);
  });
});

//CONNECT THE DATABASE
let con = mysql.createConnection({
    host: "localhost",
    user: "rm",
    password: "rR%S3Y7{dV$++eAA",
    database: "tahfifa_booking"
  });
  
  con.connect( err => {
    if (err) {
      console.log(err);
    }
  });



/**
   * ************************Barber
  */
 /*
    Add New Barber
 */ 
app.post('/barber/addBarber',(req,res)=>{


  con.query('INSERT INTO barber (id,phone,password,sex,wilaya,region,lang,type,workplace) VALUES(?,?,?,?,?,?,?,?,?)',
  [
    req.body.id,
    req.body.phone,
    req.body.password,
    req.body.sex,
    req.body.wilaya,
    req.body.region,
    true,
    "Barber",
    "cli"
  ]
  ,
  (err,result,fields)=>{
      if(err) console.log('Query error',err);
      res.send("success");
  });

});

/*
  Fetch All Barbers
*/
app.get('/barber',(req,res)=>{
   con.query('SELECT * FROM barber',(err,result,fields)=>{
     if(err) console.log('Query error',err);
    res.send(result);
    
   });
});

/*
Fetch one barber according to his id
*/  
app.get('/barber/:id',(req,res)=>{
  
  
con.query('SELECT barber.id as barberid, barber.phone, barber.password, barber.sex, barber.name as barberName, barber.surname, barber.b_name, CAST(barber.age AS char) as age, barber.email, barber.address, barber.image,barber.mark, barber.wilaya, barber.region,barber.lang,barber.type,barber.workplace,service.id,service.name,service.price,service.duration,service.barber_id,service.typeOfService,worktime.id as workingTimeID,worktime.day,SUBSTRING(worktime.debut,1,5) as debut,SUBSTRING(worktime.finish,1,5) as finish,worktime.isworking,worktime.barber_id FROM barber LEFT JOIN service  on barber.id=service.barber_id LEFT JOIN worktime on barber.id=worktime.barber_id WHERE barber.id=?',
[
  req.params.id
],
(err,result,fields)=>{
  if(err) { console.log('Query error',err); }
  else 
  {
	   const barbersIDS = [];
            result.forEach(e => {
                if(barbersIDS.indexOf(e.barberid)<0) {
                    barbersIDS.push(e.barberid);
                }
            });
              
            let allBarbers = [];
            
            barbersIDS.forEach( id => {
             
            let same = result.filter(e=>e.barberid === id);
            
            
            let barber = {
                    id : same[0].barberid,
                    phone : same[0].phone,
                    password : same[0].password,
                    sex : same[0].sex,
                    name : same[0].barberName,
                    surname : same[0].surname,
                    b_name : same[0].b_name,
                    age:same[0].age,
                    email :same[0].email,
                    address : same[0].address,
                    image : same[0].image,
                    mark : same[0].mark,
                    wilaya : same[0].wilaya,
                    region : same[0].region,
                    lang : same[0].lang,
                    type : same[0].type,
                    workplace:same[0].workplace,
                    services:[],
                    workingTimes:{}
                }
                const servicesIDS=[];
                same.forEach((e)=>{
                    
                    const workingTime={
                    
                        workingTimeID:e.workingTimeID,
                        day:e.day,
                        debut:e.debut,
                        finish:e.finish,
                        isworking:e.isworking,
                        theBarberID:e.barber_id
                    
                };
                    barber.workingTimes[e.day]=workingTime;
                    
                   
                    
                    if(e.id!==null && e.name!==null && e.price!==null && e.duration!==null && e.barber_id!==null && e.durationHours!==0 && e.durationMinutes!==0){
                       
                        const hours = (e.duration / 60);
                        const durationHours = Math.floor(hours);
                        const minutes = (hours - durationHours) * 60;
                        const durationMinutes = Math.round(minutes);
                       
                        const service = {
                            serviceId:e.id,
                            name : e.name,
                            price : e.price,
                            duration : e.duration,
                            barberID:e.barber_id,
                            typeOfService:e.typeOfService,
                            durationHour:durationHours,
                            durationMinute:durationMinutes
                    }

                    

                    if(!servicesIDS.includes(e.id)){
                        barber.services.push(service);
                        servicesIDS.push(e.id);
                        
                    }

                    
                    
                    
                    }else{
                        return;
                    }


                    
                    
                });
                allBarbers.push(barber);
                });
	  
	  
  res.send(allBarbers);
  
  }
  
});
});


/*
Fetch one barber feedbacks
*/ 
app.get('/feedback/:barber_id',(req,res)=>{
  
  
  con.query('SELECT feedback.id, feedback.mark, feedback.comment, feedback.date, client.image, client.name,client.surname FROM feedback LEFT JOIN client on feedback.client_id=client.id WHERE feedback.barber_id=?',
  [
    req.params.barber_id
  ],
  (err,result,fields)=>{
    if(err) console.log('Query error',err);
    res.send(result);
    console.log(result);
  });
  });

/*
  Update barber password
*/ 
app.patch('/barber/updatePassword/:id',(req,res)=>{
  
  con.query('UPDATE barber SET password = ? WHERE id= ?',
  [
    req.body.password,
    req.params.id
  ],
  (err,result,fields)=>{
    if(err) console.log('Query error',err);
    res.send("success");
  });
});

/*
  Update barber workplace
*/ 
app.patch('/barber/updateWorkplace/:id',(req,res)=>{
  
  con.query('UPDATE barber SET workplace = ? WHERE id= ?',
  [
    req.body.workplace,
    req.params.id
  ],
  (err,result,fields)=>{
    if(err) console.log('Query error',err);
    res.send("success");
  });
});

/*
  Update barber address
*/ 
app.patch('/barber/updateAddress/:id',(req,res)=>{
  
  con.query('UPDATE barber SET address = ? WHERE id= ?',
  [
    req.body.address,
    req.params.id
  ],
  (err,result,fields)=>{
    if(err) console.log('Query error',err);
    res.send("success");
  });
});


/*
  Update Barber phone
*/

app.patch('/barber/updatePhone/:barberid',(req,res)=>{
  
con.query(`UPDATE barber SET id=?,phone=? WHERE id= ?`,
[
  req.body.id,
  req.body.phone,
  req.params.barberid
],
(err,result,fields)=>{
  if(err) console.log('Query error',err);
  res.send("success");
});
});

/*
  Update Barber language
*/

app.patch('/barber/updateLang/:id',(req,res)=>{
  
  con.query(`UPDATE barber SET lang=? WHERE id= ?`,
  [
    req.body.lang,
    req.params.id
  ],
  (err,result,fields)=>{
    if(err) console.log('Query error',err);
    res.send("success");
  });
  });

  /*
  Update Barber profile image
*/

app.patch('/barber/profileimage/:id',(req,res)=>{
  fs.writeFile(`../var/www/html/profileImages/barber/${req.body.image}`, req.body.imgsource, 'base64', (err) => {
    if (err) {
      throw err
    }else{
      con.query(`UPDATE barber SET image=? WHERE id= ?`,
      [
        req.body.image,
        req.params.id
      ],
      (err,result,fields)=>{
        if(err) console.log('Query error',err);
        res.send("success");
      });
    }

  });

});

/*
  Update barber
*/ 
app.patch('/barber/updateBarber/:id',(req,res)=>{

con.query('UPDATE barber SET name=?,surname=?,b_name=?,age=?,email=?,address=?,wilaya=?,region=? WHERE id= ?',
[
  req.body.name,
  req.body.surname,
  req.body.b_name,
  req.body.age,
  req.body.email,
  req.body.address,
  req.body.wilaya,
  req.body.region,
  req.params.id
],
(err,result,fields)=>{
  if(err) console.log('Query error',err);
  res.send(result);
  
});
});

/*
  Delete barber
*/
app.delete('/barber/deleteBarber/:id',(req,res)=>{

con.query('DELETE FROM barber WHERE id=?',
[
  req.params.id
],
(err,result,fields)=>{
  if(err) console.log('Query error',err);
  res.send("success");
});

});

/**
   * ************************Portfolio
  */
 /*
    Add 6 photos
 */ 
app.post('/portfolio', (req, res) => {
  let values = [];
  values.push([null,req.body.barber_id],[null,req.body.barber_id],[null,req.body.barber_id],
    [null,req.body.barber_id],[null,req.body.barber_id],[null,req.body.barber_id]);

	con.query('INSERT INTO portfolio (model,barber_id) VALUES ?',
  [values]
  ,
  (err,result,fields)=>{
      if(err) console.log('Query error',err);
      res.send(result);
      
  });
});

/*
    Update One Photo
 */ 
app.post('/portfolio/:barber_id/:id', (req, res) => {
	fs.writeFile(`../var/www/html/uploads/${req.body.model}`, req.body.imgsource, 'base64', (err) => {
    if (err) {
      throw err
    }else{
      con.query('UPDATE portfolio SET model = ? WHERE barber_id= ? && id= ?',
      [
        req.body.model,
        req.params.barber_id,
        req.params.id
      ]
  ,
  (err,result,fields)=>{
      if(err) console.log('Query error',err);
      res.send(result);
      
  });
    }
  });
 
});

/*
Fetch one barber photo
*/ 
app.get('/portfolio/:barber_id',(req,res)=>{
  
  
  con.query('SELECT portfolio.id, portfolio.model FROM portfolio WHERE portfolio.barber_id=? ORDER BY portfolio.id',
  [
    req.params.barber_id
  ],
  (err,result,fields)=>{
    if(err) console.log('Query error',err);
    res.send(result);
    console.log(result);
  });
  });



/**
   * ************************Service
  */
 /*
    Add New Service
 */ 
app.post('/service/addService',(req,res)=>{

  
  con.query('INSERT INTO service (name,price,duration,barber_id,typeOfService) VALUES(?,?,?,?,?)',
  [
    req.body.name,
    req.body.price,
    req.body.duration,
    req.body.barber_id,
    req.body.typeOfService
  ]
  ,
  (err,result,fields)=>{
      if(err) console.log('Query error',err);
      res.send(result);
      
  });

});

/*
  Update service
*/ 
app.patch('/service/updateService/:id',(req,res)=>{
  
  con.query('UPDATE service SET name=?, price=?, duration=?,typeOfService=? WHERE id= ?',
  [
    req.body.name,
    req.body.price,
    req.body.duration,
    req.body.typeOfService,
    req.params.id
  ],
  (err,result,fields)=>{
    if(err) console.log('Query error',err);
    res.send("success");
    
  });
  });
  
  /*
    Delete service
  */
  app.delete('/service/deleteService/:id',(req,res)=>{
  
  con.query('DELETE FROM service WHERE id=?',
  [
    req.params.id
  ],
  (err,result,fields)=>{
    if(err) console.log('Query error',err);
    res.send("success");
  });
  
  });




 /***********************************************************************/
   //Bookings MAnipulations
//GET THE CLIENT'S BOOKINGS Top Display for the Barber

app.get("/clientbookings/:barberId",(req,res)=>{

  const barberId = req.params.barberId;

  const query = "SELECT booking.id,booking.amount , booking.id ,CAST(booking.date AS char) as date,CAST(booking.date_booking AS char) as bookingDate,SUBSTRING(booking.start,1,5) as start,SUBSTRING(booking.end,1,5)as end,booking.client_id as clientId,booking.barber_id as barberId , booking.status, booking.duration as bookingDuration , booking.address,booking.region,booking.wilaya,service.name , service.price , service.duration  as serviceDuration from booking INNER JOIN composition on composition.booking_id = booking.id  INNER JOIN service on  service.id = composition.service_id WHERE booking.barber_id = ? "
  
  con.query(query,[barberId],(err,result,fields)=>{
      if(err) res.send(err);

   
      res.send(result);
  });

  });




   //GET THE CLIENT'S BOOKING Information
   app.get("/client/clientinfos/:clientId",(req,res)=>{

    const clientId = req.params.clientId;
    
    const query = "SELECT booking.address ,booking.wilaya ,booking.region,client.name,client.surname,client.phone,client.image from booking INNER JOIN client on client.id = booking.client_id  WHERE booking.client_id = ? "
    
    con.query(query,[clientId],(err,result,fields)=>{
        if(err) res.send(err);
    
        res.send(result);
    
    });
    
    
    
    });

/***********************************************************************/

  /**
   * ************************Worktime
  */
 /*
    Add New Worktime
 */ 
app.post('/worktime/addWorktime',(req,res)=>{

  let values = [];
 console.log(req.body.barber_id);
  values.push(['Sam',null,null,false,req.body.barber_id],['Dim',null,null,false,req.body.barber_id],
              ['Lun',null,null,false,req.body.barber_id],['Mar',null,null,false,req.body.barber_id],
              ['Mer',null,null,false,req.body.barber_id],['Jeu',null,null,false,req.body.barber_id],
              ['Ven',null,null,false,req.body.barber_id]);
      
  con.query('INSERT INTO worktime (day,debut,finish,isworking,barber_id) VALUES ?',
  [values]
  ,
  (err,result,fields)=>{
      if(err) console.log(err);
      res.send(err);
  });

});


/*
  Update worktime
*/ 
app.patch('/worktime/updateWorktime/:barber_id',(req,res)=>{
  


con.query("UPDATE worktime SET isworking=(CASE WHEN day='Sam' then ? WHEN day='Dim' then ? WHEN day='Lun' then ? WHEN day='Mar' then ? WHEN day='Mer' then ? WHEN day='Jeu' then ? WHEN day='Ven' then ? end), debut=(CASE WHEN day='Sam' then ?  WHEN day='Dim' then ? WHEN day='Lun' then ? WHEN day='Mar' then ? WHEN day='Mer' then ? WHEN day='Jeu' then ? WHEN day='Ven' then ? end), finish=(CASE WHEN day='Sam' then ?  WHEN day='Dim' then ? WHEN day='Lun' then ? WHEN day='Mar' then ? WHEN day='Mer' then ? WHEN day='Jeu' then ? WHEN day='Ven' then ? end) WHERE barber_id=?",
[
  
  req.body.isworkingSat,
  req.body.isworkingSun,
  req.body.isworkingMon,
  req.body.isworkingTue,
  req.body.isworkingWed,
  req.body.isworkingThu,
  req.body.isworkingFri,
  req.body.debutSat,
  req.body.debutSun,
  req.body.debutMon,
  req.body.debutTue,
  req.body.debutWed,
  req.body.debutThu,
  req.body.debutFri,
  req.body.finishSat,
  req.body.finishSun,
  req.body.finishMon,
  req.body.finishTue,
  req.body.finishWed,
  req.body.finishThu,
  req.body.finishFri,
  req.params.barber_id
  
],(err,result,fields)=>{
    if(err) console.log(err);
    res.send(err);
  });
});

/*********************************************************************************************************/

//GET REQUESTS 

//GET THE BARBER'S SERVICES
app.get("/barber/services/:barberId",(req,res)=>{
const barberId = req.params.barberId;

con.query("SELECT id, duration , name, price , typeOfService from service where service.barber_id = ?",[barberId],(err, result, fields)=>{
    if (err) res.send(err);
    res.send(result);


});


});


//GET THE BARBER'S Working Time
app.get("/barber/hours/:barberId",(req,res)=>{
  const barberId = req.params.barberId;
  
  con.query("SELECT day , SUBSTRING(debut,1,5) as start , SUBSTRING(finish,1,5) as end , barber_id from worktime where barber_id = ?",[barberId],(err, result, fields)=>{
      if (err) res.send(err);
      res.send(result);
  
  
  });
  
  
  });
  
    //GET "EN ATTENTE" BARBER'S BOOKINGS
app.get("/pendingBarberBookings/:barberId",(req,res)=>{
  // clientbookings
    const barberId = req.params.barberId;

    const query = "SELECT id from booking WHERE status = 'en attente' AND  barber_id = ?  "
    
    con.query(query,[barberId],(err,result,fields)=>{
        if(err) res.send(err);
 
     
        res.send(result);
    });

    });


//GET THE BARBER'S BOOKINGS
app.get("/bookings/barberBookings/:barberId",(req,res)=>{

  const barberId = req.params.barberId;
  
  const query = "SELECT duration as bookingDuration , CAST(date AS char) as date,SUBSTRING(date_booking,1,10) as bookingDate,SUBSTRING(start,1,5) as start,SUBSTRING(booking.end,1,5)as end,client_id as clientId,barber_id as barberId , status  from booking WHERE status = 'en attente' AND barber_id = ? OR status = 'confirmée' AND barber_id = ? "
  
  con.query(query,[barberId,barberId],(err,result,fields)=>{
      if(err) res.send(err);
  
      res.send(result);
  
  });
  
  
  
  });


//GET THE CLIENT'S BOOKINGS To Display for the Barber

app.get("/barberBookings/:barberId",(req,res)=>{
  // clientbookings
    const barberId = req.params.barberId;

    const query = "SELECT booking.id,booking.amount , booking.id ,CAST(booking.date AS char) as date,CAST(booking.date_booking AS char) as bookingDate,SUBSTRING(booking.start,1,5) as start,SUBSTRING(booking.end,1,5)as end,booking.client_id as clientId,booking.barber_id as barberId , booking.status, booking.duration as bookingDuration , booking.address,booking.region,booking.wilaya,service.name , service.price , service.duration  as serviceDuration from booking INNER JOIN composition on composition.booking_id = booking.id  INNER JOIN service on  service.id = composition.service_id WHERE booking.barber_id = ? "
    
    con.query(query,[barberId],(err,result,fields)=>{
        if(err) res.send(err);
 
     
        res.send(result);
    });

    });


  //GET THE BARBER'S Information
app.get("/barber/barberinfos/:barberId",(req,res)=>{

  const barberId = req.params.barberId;
  
  const query = "SELECT phone , address , name ,surname , wilaya ,region,image from barber WHERE id = ? "
  
  con.query(query,[barberId],(err,result,fields)=>{
      if(err) res.send(err);
  
      res.send(result);
  
  });
  
  
  
  });

//Get the REviews Made by the client for all the barbers

  app.get("/client/barbersfeedbacks/:clientId",(req,res)=>{
    const clientId = req.params.clientId;
    const query = "SELECT comment,mark,client_id as clientId , barber_id as barberId  from feedback WHERE client_id = ? "
    
    con.query(query,[clientId],(err,result,fields)=>{
        if(err) res.send(err);
    
        res.send(result);
    
    });
  
  
  
    });


  //Get the barbers history

  app.get("/client/barbers/:clientId",(req,res)=>{
  const clientId = req.params.clientId;
  const query = "SELECT barber_id as barberId from booking   WHERE client_id = ? AND status = 'réalisée' GROUP BY barber_id "
  
  con.query(query,[clientId],(err,result,fields)=>{
      if(err) res.send(err);
  
      res.send(result);
  
  });



  });



//GET THE BARBERS 

app.get('/barbers/allbarbers/:sex',(req,res)=>{

 const sex = req.params.sex;

con.query('SELECT id, phone ,sex,name,surname,b_name as barberName ,age,address,image,mark,wilaya,region , type  FROM barber where sex = ? ORDER BY mark DESC ',[sex],(err,result,fields)=>{
    if(err) console.log('Query error',err);
   res.send(result);
  });
});



//GET THE CLIENT'S BOOKINGS

app.get("/client/bookings/:clientId",(req,res)=>{

  const clientId = req.params.clientId;

  const query = "SELECT booking.id,booking.amount ,booking.address,booking.wilaya,booking.region, booking.id ,CAST(booking.date AS char) as date,CAST(booking.date_booking AS char) as bookingDate,SUBSTRING(booking.start,1,5) as start,SUBSTRING(booking.end,1,5)as end,booking.client_id as clientId,booking.barber_id as barberId , booking.status, booking.duration as bookingDuration , booking.address,booking.region,booking.wilaya,service.name , service.price , service.duration  as serviceDuration from booking INNER JOIN composition on composition.booking_id = booking.id  INNER JOIN service on  service.id = composition.service_id   WHERE client_id = ? "
  
  con.query(query,[clientId],(err,result,fields)=>{
      if(err) { res.send(err); }
  else {
let bookingsIds = [];


result.forEach(e => {
      if(bookingsIds.indexOf(e.id)<0) {
        bookingsIds.push(e.id);
      }
});

let allBookings = [];

bookingsIds.forEach( id => {

let same = result.filter(e=>e.id === id);

    let booking = {
            address : same[0].address ,
            amount : same[0].amount,
            barberId : same[0].barberId,
            bookingDate : same[0].bookingDate,
            bookingDuration : same[0].bookingDuration,
            clientId : same[0].clientId,
            date : same[0].date,
            end : same[0].end,
            id : same[0].id,
            region : same[0].region,
            services:[],
            start :same[0].start ,
            status : same[0].status,
            wilaya : same[0].wilaya
            
    }
    same.forEach(e=>{
          const service = {
                name : e.name,
                price : e.price,
                serviceDuration : e.serviceDuration
          }
        booking.services.push(service);
    });
      allBookings.push(booking);
      });


	  
      res.send(allBookings);
  }
  });
  
  
  
  });
  
  //GET THE NUMBER OF THE CONFIRMED CLIENT'S BOOKINGS

app.get("/client/confirmedbookings/:clientId",(req,res)=>{

  const clientId = req.params.clientId;

  const query = "SELECT COUNT(id) as Num  FROM booking   WHERE client_id = ? AND status = 'confirmée' "
  
  con.query(query,[clientId],(err,result,fields)=>{
      if(err) res.send(err);
  
      res.send(result);
  
  });
  
  
  
  });





//POST REQUESTS 

 //ADD A Feedback    
 app.post("/client/addreview",(req,res)=>{

const feedbackDate = moment().format().substring(0,19)+".000000" ;

  con.query("INSERT INTO feedback (client_id,barber_id, comment,mark,date) VALUES (?,?, ?,?,?)"
  ,[
   req.body.clientId,
   req.body.barberId, 
   req.body.comment,
   req.body.mark,
   feedbackDate
 ],
  
  (err,result,fields)=>{
    if (err){
      console.log(err);
       res.send(err);
   
   }else { 
     console.log("success");
     res.send("Success");

    }

});

});

  //ADD A NEW BOOKING TO THE DATABASE   
  app.post("/clientbookings/addbooking",(req,res)=>{

const services = req.body.services.map(e=>e.id);

bookingDate =  req.body.bookingDate.substring(0,19)+".000000" ;

bDate =  req.body.date.substring(0,23)+"000" ;
let composition = [];
const id = req.body.barberId+req.body.bookingDate.substring(0,9)+req.body.start ;


    con.query(
      "INSERT INTO booking (id ,amount ,date,date_booking,duration,start,end,status,address,region,wilaya,client_id,barber_id) VALUES (?,?,?, ?, ?, ?, ?, ?,?,?,?,?,?)"
      
    ,[
	id,
     req.body.amount,
	  bDate,
     bookingDate, 
     req.body.duration,
     req.body.start,
     req.body.end,
     req.body.status,
     req.body.address,
     req.body.region,
     req.body.wilaya,
     req.body.clientId,
     req.body.barberId,
   ],
    
    (err,result,fields)=>{
      if (err){
        console.log(err);
         res.send(result);
     
     }else { 

       console.log("success");
//////////////////////////////////////////////////////////////////
      services.forEach(service => {
          composition.push([id,service])
      });
       con.query(
        "INSERT INTO composition (booking_id , service_id) VALUES ?" 
      ,[composition] , (err,result,fields)=>{
        if(err) console.log(err)
        else console.log("success")

     });
///////////////////////////////////////////////////////////////////////////
       res.send(result);
 
      }
       
   });
 
  });

      
///////////////////////////////////////////////////////////////////////////

//update FeedBack

app.patch("/client/updatefeedback",(req,res)=>{


  con.query("UPDATE feedback SET comment = ? , mark = ?  WHERE client_id= ? AND barber_id = ?",
  [req.body.review.comment,
   req.body.review.mark,
   req.body.review.clientId,
   req.body.review.barberId
  
  ],
  (err,result,fields)=>{ 
  if (err) {
  console.log(err);

    res.send(err);
  } else {
    console.log(result);

    res.send("Success");
  }
  
});
 
});



//change Manually a Booking throught the booking Detail 
app.patch("/bookings/changebooking",(req,res)=>{
 
    con.query("UPDATE booking SET status = ? WHERE  booking.id= ? ",[req.body.type,req.body.id],
    (err,result,fields)=>{ 
  
    if (err) {
      res.send(err);
    } else {
      res.send("Success");
    }
    
  });
   
  });


//Cancel a Booking
app.patch("/bookings/cancelbooking",(req,res)=>{
 
  con.query("UPDATE booking SET status = 'annulée' WHERE   booking.id= ? ",[req.body.id],
  (err,result,fields)=>{ 

  if (err) {
    res.send(err);
  } else {
    res.send("Success");
  }
  
});
 
});

//CANCEL EXPIRED BOOKINGS
  
app.patch("/bookings/expiredbookings",(req,res)=>{
   con.query("UPDATE booking SET status = 'expirée' WHERE  SUBSTRING(date_booking,1,10)  = SUBSTRING(NOW(),1,10) AND booking.client_id = ? AND status = 'en attente'  AND CURRENT_TIMESTAMP > start OR SUBSTRING(date_booking,1,10)  <  SUBSTRING(NOW(),1,10)  AND booking.client_id = ? AND status = 'en attente' ",[req.body.clientId,req.body.clientId],
   (err,result,fields)=>{ 
 
   if (err) {
     console.log(err)
     res.send(err);
   } else {
	 console.log(result);
     res.send(result);
   }
   
 });
 
 });

 //Cancel Client Expired Bookings with GET MEthod
 
app.get("/getbookings/expired/:clientId",(req,res)=>{

 
   con.query("SELECT booking.id,booking.amount , booking.id ,CAST(booking.date AS char) as date,CAST(booking.date_booking AS char) as date_booking,SUBSTRING(booking.start,1,5) as start,SUBSTRING(booking.end,1,5)as end,booking.client_id as clientId,booking.barber_id as barberId , booking.status, booking.duration as bookingDuration , booking.address,booking.region,booking.wilaya,barber.name,barber.surname,barber.b_name from booking INNER JOIN barber on barber.id = booking.barber_id WHERE  SUBSTRING(date_booking,1,10)  = SUBSTRING(NOW(),1,10) AND booking.client_id = ? AND status = 'en attente'  AND CURRENT_TIMESTAMP > start OR SUBSTRING(date_booking,1,10)  <  SUBSTRING(NOW(),1,10)  AND booking.client_id = ? AND status = 'en attente' ",[req.params.clientId,req.params.clientId],
   (err,result,fields)=>{ 
 
   if (err) {
     res.send(err);
   } else {
           if(result.length >0) {
            con.query("UPDATE booking SET status = 'expirée' WHERE  SUBSTRING(date_booking,1,10)  = SUBSTRING(NOW(),1,10) AND booking.client_id = ? AND status = 'en attente'  AND CURRENT_TIMESTAMP > start OR SUBSTRING(date_booking,1,10)  <  SUBSTRING(NOW(),1,10)  AND booking.client_id = ? AND status = 'en attente' ",[req.params.clientId,req.params.clientId],
            (err,result,fields)=>{ 
          
            if (err) {
              console.log(err)
              res.send(err);
            } else {
           
              console.log("success");
            }
            
          });
           }
   
     res.send(result);
   }
   
 });
 
 });
 
 
  //Cancel barber's Expired Bookings with GET MEthod
 
app.get("/barber/getbookings/expired/:barberId",(req,res)=>{

 
   con.query("SELECT * from booking WHERE  SUBSTRING(date_booking,1,10)  = SUBSTRING(NOW(),1,10) AND booking.barber_id = ? AND status = 'en attente'  AND CURRENT_TIMESTAMP > start OR SUBSTRING(date_booking,1,10)  <  SUBSTRING(NOW(),1,10)  AND booking.barber_id = ? AND status = 'en attente'",[req.params.barberId,req.params.barberId],
   (err,result,fields)=>{ 
 
   if (err) {
     res.send(err);
   } else {
           if(result.length >0) {
            con.query("UPDATE booking SET status = 'expirée' WHERE  SUBSTRING(date_booking,1,10)  = SUBSTRING(NOW(),1,10) AND booking.barber_id = ? AND status = 'en attente'  AND CURRENT_TIMESTAMP > start OR SUBSTRING(date_booking,1,10)  <  SUBSTRING(NOW(),1,10)  AND booking.barber_id = ? AND status = 'en attente' ",[req.params.barberId,req.params.barberId],
            (err,result,fields)=>{ 
          
            if (err) {
              console.log(err)
              res.send(err);
            } else {
           
              console.log("success");
            }
            
          });
           }
   
     res.send(result);
   }
   
 });
 
 });
 
 
 

app.get("/expire",(req,res)=>{
  console.log(req.body.clientId);
 
   con.query("SELECT CURRENT_TIMESTAMP , status, cast(now() as date),end,date  as date,date_booking as bookingDate, NOW() FROM booking WHERE  SUBSTRING(date_booking,1,10)  = SUBSTRING(NOW(),1,10) AND booking.client_id = '557115451' AND status = 'en attente'  AND CURRENT_TIMESTAMP > start OR SUBSTRING(date_booking,1,10) < SUBSTRING(NOW(),1,10)  AND booking.client_id = '557115451' ",[],
   (err,result,fields)=>{ 
 
   if (err) {
     res.send(err);
   } else {
 
     res.send(result);
   }
   
 });
 
 });
 
 
 /***************************TOKENS********************************/
 
  //ADD Client Token    
 app.post("/client/addtoken",(req,res)=>{


  con.query("INSERT INTO clienttoken (expo_token,client_id) VALUES (?,?)"
  ,[
   req.body.expoToken,
   req.body.clientId, 
   

 ],
  
  (err,result,fields)=>{
    if (err){
      console.log(err);
       res.send(err);
   
   }else { 
     console.log("success");
     res.send("Success");

    }

});

});
 
 //Get the client Tokens

  app.get("/client/clienttokens/:clientId",(req,res)=>{
    const clientId = req.params.clientId;
    const query = "SELECT expo_token as expoToken , client_id as clientId  from clienttoken WHERE client_id = ?  "
    
    con.query(query,[clientId],(err,result,fields)=>{
        if(err) res.send(err);
    
        res.send(result);
    
    });
  
  
  
    });
	
	  //ADD Barber Token    
 app.post("/barber/addtoken",(req,res)=>{


  con.query("INSERT INTO barbertoken (expo_token,barber_id) VALUES (?,?)"
  ,[
   req.body.expoToken,
   req.body.barberId, 
   

 ],
  
  (err,result,fields)=>{
    if (err){
      console.log(err);
       res.send(err);
   
   }else { 
     console.log("success");
     res.send("Success");

    }

});

});
	
	
	 //Get the barber's Tokens

  app.get("/barber/barbertokens/:barberId",(req,res)=>{
    const barberId = req.params.barberId;
    const query = "SELECT expo_token as expoToken , barber_id as barberId  from barbertoken WHERE barber_id = ?  "
    
    con.query(query,[barberId],(err,result,fields)=>{
        if(err) res.send(err);
    
        res.send(result);
    
    });
  
  
  
    });

 
 //Remove Token When logout 
	 
 /*
  Delete client Token
*/
app.delete('/client/deletetoken/:token',(req,res)=>{



con.query('DELETE FROM clienttoken WHERE expo_token=?',
[
  req.params.token
],
(err,result,fields)=>{
  if(err) console.log('Query error',err);
  res.send("success");
});

});

 /*
  Delete barber's Token
*/
app.delete('/barber/deletetoken/:token',(req,res)=>{

con.query('DELETE FROM barbertoken WHERE expo_token=?',
[
  req.params.token
],
(err,result,fields)=>{
  if(err) console.log('Query error',err);
  res.send("success");
});

});
 
 /* SEP*/

 


/* Client */
 /*
    Add New Client
 */ 
app.post('/client/addClient',(req,res)=>{


  con.query('INSERT INTO client (id,phone,password,sex,name,surname,wilaya,region,lang) VALUES(?,?,?,?,?,?,?,?,?)',
  [
    req.body.id,
    req.body.phone,
    req.body.password,
    req.body.sex,
    req.body.name,
    req.body.surname,
    req.body.wilaya,
    req.body.region,
    true,
  ]
  ,
  (err,result,fields)=>{
      if(err) console.log('Query error',err);
      res.send("success");
  });

});

/*
  Fetch All Clients
*/
app.get('/client',(req,res)=>{
   con.query('SELECT * FROM client',(err,result,fields)=>{
     if(err) console.log('Query error',err);
    res.send(result);
   });
});

/*
Fetch one client according to his id
*/  
app.get('/client/:id',(req,res)=>{
con.query('SELECT * FROM client WHERE id= ?',
[
  req.params.id
],
(err,result,fields)=>{
  if(err) console.log('Query error',err);
  res.send(result);
});
});


/*
  Update client password
*/ 
app.patch('/client/updatePassword/:id',(req,res)=>{
  
  con.query('UPDATE client SET password = ? WHERE id= ?',
  [
    req.body.password,
    req.params.id
  ],
  (err,result,fields)=>{
    if(err) console.log('Query error',err);
    res.send("success");
  });
});


/*
  Update Client language
*/

app.patch('/client/updateLang/:id',(req,res)=>{
  
  con.query(`UPDATE client SET lang=? WHERE id= ?`,
  [
    req.body.lang,
    req.params.id
  ],
  (err,result,fields)=>{
    if(err) console.log('Query error',err);
    res.send("success");
  });
  });

/*
  Update Client phone
*/

app.patch('/client/updatePhone/:clientid',(req,res)=>{
  
con.query(`UPDATE client SET id=?,phone=? WHERE id= ?`,
[
  req.body.id,
  req.body.phone,
  req.params.clientid
],
(err,result,fields)=>{
  if(err) console.log('Query error',err);
  res.send("success");
});
});

/*
  Update Client profile image
*/

app.patch('/client/profileimage/:id',(req,res)=>{
  fs.writeFile(`../var/www/html/profileImages/client/${req.body.image}`, req.body.imgsource, 'base64', (err) => {
    if (err) {
      throw err
    }else{
      con.query(`UPDATE client SET image=? WHERE id= ?`,
      [
        req.body.image,
        req.params.id
      ],
      (err,result,fields)=>{
        if(err) console.log('Query error',err);
        res.send("success");
      });
    }

  });

});

/*
  Update client
*/ 
app.patch('/client/updateClient/:id',(req,res)=>{
  
con.query('UPDATE client SET name=?,surname=?,email=?,address=?,image=?,wilaya=?,region=? WHERE id= ?',
[
  req.body.name,
  req.body.surname,
  req.body.email,
  req.body.address,
  req.body.image,
  req.body.wilaya,
  req.body.region,
  req.params.id
],
(err,result,fields)=>{
  if(err) console.log('Query error',err);
  res.send("success");
});
});

/*
  Delete client
*/
app.delete('/client/deleteClient/:id',(req,res)=>{

con.query('DELETE FROM client WHERE id=?',
[
  req.params.id
],
(err,result,fields)=>{
  if(err) console.log('Query error',err);
  res.send("success");
});

});

/*******************************************************************************************/

// Starting our server.
app.listen(3000, () => {
    console.log('Connected');
   });

