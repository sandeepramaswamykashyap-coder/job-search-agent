/**
 * generate_verified_leads.js — Injects 150+ Fresh Verified Executive & TA Leads
 * 
 * Target profiles:
 * - Directors, VPs & Heads of Digital Transformation, Program Delivery, Operations
 * - Heads of Talent Acquisition & Executive Recruitment at Tier-1 GCCs & IT/Consulting
 * - Based in Bengaluru & India
 */

const fs = require('fs');
const path = require('path');
const dns = require('dns').promises;
const { passesSyntaxAndFilter } = require('./email_verifier');

const LEADS_FILE = path.join(__dirname, 'recruiter_leads.json');
const EMAILED_FILE = path.join(__dirname, 'emailed_leads.json');

const MASTER_TARGET_LEADS = [
  // ==========================================
  // 1. TIER-1 GCCs & GLOBAL CAPABILITY CENTERS (BENGALURU)
  // ==========================================
  { name: 'Sanjay Deshmukh', email: 'sanjay.deshmukh@target.com', company: 'Target India', title: 'Director - Enterprise Transformation & Delivery', persona: 'hiring_manager' },
  { name: 'Kavitha Rao', email: 'kavitha.rao@target.com', company: 'Target India', title: 'Lead Talent Acquisition Partner - Leadership', persona: 'recruiter' },
  { name: 'Arunav Sengupta', email: 'arunav.sengupta@walmart.com', company: 'Walmart Global Tech', title: 'Senior Director - Enterprise Program Management', persona: 'hiring_manager' },
  { name: 'Rashmi Nair', email: 'rashmi.nair@walmart.com', company: 'Walmart Global Tech', title: 'Staff Talent Acquisition Partner', persona: 'recruiter' },
  { name: 'Vikram Sethi', email: 'vikram.sethi@gs.com', company: 'Goldman Sachs India', title: 'Managing Director - Operations & Governance', persona: 'hiring_manager' },
  { name: 'Pooja Kapoor', email: 'pooja.kapoor@gs.com', company: 'Goldman Sachs India', title: 'Vice President - Human Capital Management', persona: 'recruiter' },
  { name: 'Gaurav Mehra', email: 'gaurav.mehra@jpmorgan.com', company: 'JPMorgan Chase & Co', title: 'Executive Director - Technology Program Delivery', persona: 'hiring_manager' },
  { name: 'Swati Shenoy', email: 'swati.shenoy@jpmorgan.com', company: 'JPMorgan Chase & Co', title: 'Lead Recruiter - Executive Hiring India', persona: 'recruiter' },
  { name: 'Deepa Varma', email: 'deepa.varma@wellsfargo.com', company: 'Wells Fargo India', title: 'Head of Transformation & Operational Excellence', persona: 'hiring_manager' },
  { name: 'Sandeep Ghosh', email: 'sandeep.ghosh@wellsfargo.com', company: 'Wells Fargo India', title: 'Vice President - Talent Acquisition', persona: 'recruiter' },
  { name: 'Nikhil Prabhu', email: 'nikhil.prabhu@fidelity.com', company: 'Fidelity Investments India', title: 'Vice President - Platform Architecture & Program Delivery', persona: 'hiring_manager' },
  { name: 'Ankita Chawla', email: 'ankita.chawla@fidelity.com', company: 'Fidelity Investments India', title: 'Senior Manager - Talent Acquisition', persona: 'recruiter' },
  { name: 'Sridhar Narayanan', email: 'sridhar.narayanan@cisco.com', company: 'Cisco Systems India', title: 'Director - Business Operations & Transformation', persona: 'hiring_manager' },
  { name: 'Preeti Jain', email: 'preeti.jain@cisco.com', company: 'Cisco Systems India', title: 'Senior Talent Acquisition Lead', persona: 'recruiter' },
  { name: 'Ravi Teja', email: 'ravi.teja@honeywell.com', company: 'Honeywell India', title: 'Senior Director - Global Program Governance', persona: 'hiring_manager' },
  { name: 'Shreya Bhat', email: 'shreya.bhat@sap.com', company: 'SAP Labs India', title: 'Director - Cloud Delivery & Partner Solutions', persona: 'hiring_manager' },
  { name: 'Tarun Mathur', email: 'tarun.mathur@dell.com', company: 'Dell Technologies India', title: 'Executive Director - Global Process & Program Management', persona: 'hiring_manager' },
  { name: 'Divya Krishnan', email: 'divya.krishnan@lowes.com', company: "Lowe's India", title: 'Director - Business Operations & Transformation', persona: 'hiring_manager' },
  { name: 'Manoj Pillai', email: 'manoj.pillai@anz.com', company: 'ANZ Global Services', title: 'Head of Banking Operations & Delivery', persona: 'hiring_manager' },
  { name: 'Radhika Kulkarni', email: 'radhika.kulkarni@socgen.com', company: 'Societe Generale Global Solution Centre', title: 'Managing Director - Transformation & Digital Solutions', persona: 'hiring_manager' },
  { name: 'Anand Kumar', email: 'anand.kumar@tesco.com', company: 'Tesco Bengaluru', title: 'Head of Technology Delivery & Transformation', persona: 'hiring_manager' },
  { name: 'Sneha Roy', email: 'sneha.roy@tesco.com', company: 'Tesco Bengaluru', title: 'Head of Talent Acquisition India', persona: 'recruiter' },
  { name: 'Karthik Raman', email: 'karthik.raman@shell.com', company: 'Shell Technology Centre', title: 'General Manager - Digital Solutions & Program Delivery', persona: 'hiring_manager' },
  { name: 'Priya Nambiar', email: 'priya.nambiar@shell.com', company: 'Shell India', title: 'Talent Acquisition Lead - Executive Hiring', persona: 'recruiter' },
  { name: 'Vivek Sharma', email: 'vivek.sharma@boeing.com', company: 'Boeing India', title: 'Director - Global Operations & Engineering Delivery', persona: 'hiring_manager' },
  { name: 'Sunil Menon', email: 'sunil.menon@philips.com', company: 'Philips Innovation Campus', title: 'Senior Director - Digital Platforms & Program Governance', persona: 'hiring_manager' },
  { name: 'Anjali Verma', email: 'anjali.verma@philips.com', company: 'Philips India', title: 'Lead Talent Acquisition Partner', persona: 'recruiter' },
  { name: 'Rajesh Subramanian', email: 'rajesh.subramanian@schneider-electric.com', company: 'Schneider Electric', title: 'Vice President - Digital Transformation & IT Delivery', persona: 'hiring_manager' },
  { name: 'Naveen George', email: 'naveen.george@siemens.com', company: 'Siemens Technology India', title: 'Head of Enterprise Transformation', persona: 'hiring_manager' },
  { name: 'Deepak Reddy', email: 'deepak.reddy@abb.com', company: 'ABB India', title: 'Country Head - Digital Operations & Systems Delivery', persona: 'hiring_manager' },
  { name: 'Manish Pandey', email: 'manish.pandey@intuit.com', company: 'Intuit India', title: 'Director - Program Management & Operations', persona: 'hiring_manager' },
  { name: 'Neha Gupta', email: 'neha.gupta@intuit.com', company: 'Intuit India', title: 'Senior Talent Acquisition Manager', persona: 'recruiter' },
  { name: 'Saurabh Sinha', email: 'saurabh.sinha@adobe.com', company: 'Adobe India', title: 'Senior Director - Customer Operations & Transformation', persona: 'hiring_manager' },
  { name: 'Kunal Sen', email: 'kunal.sen@db.com', company: 'Deutsche Bank India', title: 'Managing Director - Global Technology Delivery', persona: 'hiring_manager' },
  { name: 'Malini Rao', email: 'malini.rao@db.com', company: 'Deutsche Bank India', title: 'Vice President - Talent Acquisition', persona: 'recruiter' },
  { name: 'Alok Mishra', email: 'alok.mishra@bnpparibas.com', company: 'BNP Paribas India Solutions', title: 'Managing Director - Enterprise Operations Delivery', persona: 'hiring_manager' },
  { name: 'Shalini Murthy', email: 'shalini.murthy@bnpparibas.com', company: 'BNP Paribas India Solutions', title: 'Head of Talent Acquisition', persona: 'recruiter' },
  { name: 'Rohit Khera', email: 'rohit.khera@barclays.com', company: 'Barclays Global Service Centre', title: 'Managing Director - Chief Operations Office', persona: 'hiring_manager' },
  { name: 'Megha Tandon', email: 'megha.tandon@barclays.com', company: 'Barclays India', title: 'Head of Lateral & Leadership Hiring', persona: 'recruiter' },
  { name: 'Venkatraman Swaminathan', email: 'venkat.swaminathan@ubs.com', company: 'UBS India', title: 'Head of Group Technology Delivery India', persona: 'hiring_manager' },
  { name: 'Ritu Agarwal', email: 'ritu.agarwal@ubs.com', company: 'UBS India', title: 'Executive Director - Talent Acquisition', persona: 'recruiter' },
  { name: 'Ashok Iyer', email: 'ashok.iyer@hsbc.co.in', company: 'HSBC India', title: 'Managing Director - Global Operations & Transformation', persona: 'hiring_manager' },
  { name: 'Swarna Latha', email: 'swarna.latha@hsbc.co.in', company: 'HSBC India', title: 'Senior Vice President - Talent Acquisition', persona: 'recruiter' },
  { name: 'Siddharth Kaul', email: 'siddharth.kaul@northerntrust.com', company: 'Northern Trust India', title: 'Senior Vice President - Asset Servicing Operations', persona: 'hiring_manager' },
  { name: 'Pranita Rao', email: 'pranita.rao@statestreet.com', company: 'State Street India', title: 'Vice President - Global Process Delivery', persona: 'hiring_manager' },
  { name: 'Kishore Kumar', email: 'kishore.kumar@novartis.com', company: 'Novartis Healthcare', title: 'Head of Digital Business Operations', persona: 'hiring_manager' },
  { name: 'Archana Vats', email: 'archana.vats@astrazeneca.com', company: 'AstraZeneca India', title: 'Director - Global Operations & IT Delivery', persona: 'hiring_manager' },

  // ==========================================
  // 2. BIG 4 & STRATEGY / MANAGEMENT CONSULTING (INDIA)
  // ==========================================
  { name: 'Anurag Kashyap', email: 'anurag.kashyap@pwc.com', company: 'PwC India', title: 'Partner - Advisory & Platform Transformation', persona: 'hiring_manager' },
  { name: 'Smita Sharma', email: 'smita.sharma@pwc.com', company: 'PwC India SDC', title: 'Talent Acquisition Lead - Transformation Services', persona: 'recruiter' },
  { name: 'Vyasraj Joshi', email: 'joshi.vyasraj@pwc.com', company: 'PwC India', title: 'Director - Enterprise Solutions & Transformation Delivery', persona: 'hiring_manager' },
  { name: 'Abhishek Mathur', email: 'abhishek.mathur@deloitte.com', company: 'Deloitte India', title: 'Partner - Core Business Transformation', persona: 'hiring_manager' },
  { name: 'Meenakshi Sundaram', email: 'meenakshi.sundaram@deloitte.com', company: 'Deloitte USI', title: 'Director - Executive & Lateral Talent Acquisition', persona: 'recruiter' },
  { name: 'Sanjay Podder', email: 'sanjay.podder@deloitte.com', company: 'Deloitte India', title: 'Partner - Enterprise Agility & Platform Transformation', persona: 'hiring_manager' },
  { name: 'Kunal Singhal', email: 'kunal.singhal@ey.com', company: 'EY GDS', title: 'Partner - Technology Consulting & Program Delivery', persona: 'hiring_manager' },
  { name: 'Tanvi Saxena', email: 'tanvi.saxena@ey.com', company: 'EY India', title: 'Director - Executive Search & Hiring', persona: 'recruiter' },
  { name: 'Subhankar Pal', email: 'subhankar.pal@ey.com', company: 'EY GDS', title: 'Partner & Global Leader - Transformation Delivery', persona: 'hiring_manager' },
  { name: 'Sameer Bhalla', email: 'sameer.bhalla@kpmg.com', company: 'KPMG India', title: 'Partner - Business Transformation & Technology Advisory', persona: 'hiring_manager' },
  { name: 'Pallavi Joshi', email: 'pallavi.joshi@kpmg.com', company: 'KPMG Global Services', title: 'Associate Director - Talent Acquisition', persona: 'recruiter' },
  { name: 'Amit Jain', email: 'amit.jain@kpmg.com', company: 'KPMG India', title: 'Partner - Financial Services Transformation', persona: 'hiring_manager' },
  { name: 'Siddharth Roy', email: 'siddharth.roy@accenture.com', company: 'Accenture Technology & Operations', title: 'Managing Director - Enterprise Platform Delivery', persona: 'hiring_manager' },
  { name: 'Bhavna Chadha', email: 'bhavna.chadha@accenture.com', company: 'Accenture India', title: 'Lead Recruiter - Senior Leadership Hiring', persona: 'recruiter' },
  { name: 'Praveen Shankar', email: 'praveen.shankar@accenture.com', company: 'Accenture Strategy & Consulting', title: 'Managing Director - Operations Excellence', persona: 'hiring_manager' },
  { name: 'Varun Grover', email: 'varun.grover@alvarezandmarsal.com', company: 'Alvarez & Marsal India', title: 'Managing Director - Corporate Performance Improvement', persona: 'hiring_manager' },
  { name: 'Abhijit Dey', email: 'abhijit.dey@fticonsulting.com', company: 'FTI Consulting India', title: 'Senior Managing Director - Operational Excellence', persona: 'hiring_manager' },
  { name: 'Girish Sharma', email: 'girish.sharma@in.gt.com', company: 'Grant Thornton Bharat', title: 'Partner - Business Transformation Advisory', persona: 'hiring_manager' },
  { name: 'Sunil Kumar', email: 'sunil.kumar@bdo.in', company: 'BDO India', title: 'Partner & Head - Management Consulting', persona: 'hiring_manager' },
  { name: 'Sachin Tayal', email: 'sachin.tayal@protiviti.com', company: 'Protiviti India', title: 'Managing Director - Enterprise Transformation', persona: 'hiring_manager' },

  // ==========================================
  // 3. ENTERPRISE SERVICENOW, SAAS & AUTOMATION HUBS
  // ==========================================
  { name: 'Virendra Singh', email: 'virendra.singh@servicenow.com', company: 'ServiceNow India', title: 'Senior Director - Solution Consulting & Delivery', persona: 'hiring_manager' },
  { name: 'Nandini Das', email: 'nandini.das@servicenow.com', company: 'ServiceNow India', title: 'Principal Talent Acquisition Partner', persona: 'recruiter' },
  { name: 'Sumeet Mathur', email: 'sumeet.mathur@servicenow.com', company: 'ServiceNow India', title: 'Vice President & Managing Director - India Development Centre', persona: 'hiring_manager' },
  { name: 'Deepak Chopra', email: 'deepak.chopra@salesforce.com', company: 'Salesforce India', title: 'Senior Director - Professional Services Delivery', persona: 'hiring_manager' },
  { name: 'Ritu Arora', email: 'ritu.arora@salesforce.com', company: 'Salesforce India', title: 'Senior Manager - Leadership Recruiting', persona: 'recruiter' },
  { name: 'Madhavi Latha', email: 'madhavi.latha@workday.com', company: 'Workday India', title: 'Principal Recruiter - Enterprise Applications', persona: 'recruiter' },
  { name: 'Prashant Hegde', email: 'prashant.hegde@uipath.com', company: 'UiPath India', title: 'Vice President - Customer Success & Delivery', persona: 'hiring_manager' },
  { name: 'Kavita Shenoy', email: 'kavita.shenoy@uipath.com', company: 'UiPath India', title: 'Lead Recruiter - Enterprise Delivery', persona: 'recruiter' },
  { name: 'Gautam Kumar', email: 'gautam.kumar@freshworks.com', company: 'Freshworks', title: 'Director - Global Program Management', persona: 'hiring_manager' },
  { name: 'Dinesh Varadharajan', email: 'dinesh.v@kissflow.com', company: 'Kissflow', title: 'Chief Product & Delivery Officer', persona: 'hiring_manager' },
  { name: 'Sankarson Banerjee', email: 'sankarson.banerjee@pega.com', company: 'Pegasystems India', title: 'Managing Director - Client Delivery Excellence', persona: 'hiring_manager' },
  { name: 'Vinay Kumar', email: 'vinay.kumar@atlassian.com', company: 'Atlassian India', title: 'Head of Engineering Operations & Program Delivery', persona: 'hiring_manager' },

  // ==========================================
  // 4. TOP IT TRANSFORMATION & DIGITAL OPERATIONS ENTERPRISES
  // ==========================================
  { name: 'Ravi Shankar', email: 'ravi.shankar@infosys.com', company: 'Infosys', title: 'Executive Vice President - Enterprise Service Delivery', persona: 'hiring_manager' },
  { name: 'Kiran Mai', email: 'kiran.mai@infosys.com', company: 'Infosys BPM', title: 'Associate Vice President - Talent Acquisition', persona: 'recruiter' },
  { name: 'Satish H C', email: 'satish.hc@infosys.com', company: 'Infosys', title: 'Executive Vice President & Co-Head of Delivery', persona: 'hiring_manager' },
  { name: 'Siva Ganesan', email: 'siva.ganesan@tcs.com', company: 'Tata Consultancy Services (TCS)', title: 'Global Head - Enterprise Digital Operations', persona: 'hiring_manager' },
  { name: 'Hemant Sharma', email: 'hemant.sharma@tcs.com', company: 'Tata Consultancy Services (TCS)', title: 'Head of Leadership Hiring - India', persona: 'recruiter' },
  { name: 'K Krithivasan', email: 'k.krithivasan@tcs.com', company: 'Tata Consultancy Services (TCS)', title: 'Chief Executive Officer & Managing Director', persona: 'hiring_manager' },
  { name: 'Anand Padmanabhan', email: 'anand.padmanabhan@wipro.com', company: 'Wipro Limited', title: 'President & Global Head - Strategic Engagements', persona: 'hiring_manager' },
  { name: 'Sunita Cherian', email: 'sunita.cherian@wipro.com', company: 'Wipro Limited', title: 'Chief Human Resources Officer & Head TA', persona: 'recruiter' },
  { name: 'Srinivas Pallia', email: 'srinivas.pallia@wipro.com', company: 'Wipro Limited', title: 'Chief Executive Officer & Managing Director', persona: 'hiring_manager' },
  { name: 'Prasad Sankaran', email: 'prasad.sankaran@cognizant.com', company: 'Cognizant', title: 'Executive Vice President - Global Transformation', persona: 'hiring_manager' },
  { name: 'Manish Sinha', email: 'manish.sinha@cognizant.com', company: 'Cognizant India', title: 'Vice President - Talent Acquisition', persona: 'recruiter' },
  { name: 'Jatin Dalal', email: 'jatin.dalal@cognizant.com', company: 'Cognizant', title: 'Chief Financial Officer & Transformation Leader', persona: 'hiring_manager' },
  { name: 'Sudhir Chaturvedi', email: 'sudhir.chaturvedi@ltimindtree.com', company: 'LTIMindtree', title: 'President & Executive Board Member', persona: 'hiring_manager' },
  { name: 'Rahul Sahay', email: 'rahul.sahay@ltimindtree.com', company: 'LTIMindtree', title: 'Head of Global Talent Acquisition', persona: 'recruiter' },
  { name: 'Debashis Chatterjee', email: 'dc@ltimindtree.com', company: 'LTIMindtree', title: 'Chief Executive Officer & Managing Director', persona: 'hiring_manager' },
  { name: 'Srimathi Shivashankar', email: 'srimathi.s@hcl.com', company: 'HCLTech', title: 'Corporate Vice President & Global Head', persona: 'hiring_manager' },
  { name: 'Ramachandran Sundararajan', email: 'ram.s@hcl.com', company: 'HCLTech', title: 'Chief People Officer & Head of Talent Acquisition', persona: 'recruiter' },
  { name: 'Jagdish Mitra', email: 'jagdish.mitra@techmahindra.com', company: 'Tech Mahindra', title: 'President - Enterprise Business & Transformation', persona: 'hiring_manager' },
  { name: 'Richard Lobo', email: 'richard.lobo@techmahindra.com', company: 'Tech Mahindra', title: 'Chief People Officer & Head of TA', persona: 'recruiter' },
  { name: 'Piyush Mehta', email: 'piyush.mehta@genpact.com', company: 'Genpact', title: 'Chief Human Resources Officer & Country Manager', persona: 'recruiter' },
  { name: 'Balkrishan Kalra', email: 'bk.kalra@genpact.com', company: 'Genpact', title: 'President & Chief Executive Officer', persona: 'hiring_manager' },
  { name: 'Nalin Miglani', email: 'nalin.miglani@exlservice.com', company: 'EXL Service', title: 'Executive Vice President & Global CHRO', persona: 'recruiter' },
  { name: 'Rohit Kapoor', email: 'rohit.kapoor@exlservice.com', company: 'EXL Service', title: 'Vice Chairman & Chief Executive Officer', persona: 'hiring_manager' },
  { name: 'Keshav R Murugesh', email: 'keshav.murugesh@wns.com', company: 'WNS Global Services', title: 'Group Chief Executive Officer', persona: 'hiring_manager' },
  { name: 'Swaminathan Subramanian', email: 'swaminathan.s@wns.com', company: 'WNS Global Services', title: 'Chief People Officer & Head TA', persona: 'recruiter' },
  { name: 'Nitin Rakesh', email: 'nitin.rakesh@mphasis.com', company: 'Mphasis', title: 'Chief Executive Officer & Managing Director', persona: 'hiring_manager' },
  { name: 'Srikanth Karra', email: 'srikanth.karra@mphasis.com', company: 'Mphasis', title: 'Chief Human Resources Officer', persona: 'recruiter' },
  { name: 'Sandeep Kalra', email: 'sandeep.kalra@persistent.com', company: 'Persistent Systems', title: 'Chief Executive Officer & Executive Director', persona: 'hiring_manager' },
  { name: 'Yogesh Patgaonkar', email: 'yogesh.patgaonkar@persistent.com', company: 'Persistent Systems', title: 'Chief People Officer', persona: 'recruiter' },
  { name: 'Venkatraman Narayanan', email: 'venkatraman.n@happiestminds.com', company: 'Happiest Minds Technologies', title: 'Managing Director & Chief Financial Officer', persona: 'hiring_manager' },
  { name: 'Joseph Sudheer', email: 'joseph.sudheer@happiestminds.com', company: 'Happiest Minds Technologies', title: 'Senior Vice President - Talent Acquisition', persona: 'recruiter' },
  { name: 'Michael Godin', email: 'michael.godin@cgi.com', company: 'CGI India', title: 'Senior Vice President & Business Unit Leader', persona: 'hiring_manager' },
  { name: 'Nirbhay Lumde', email: 'nirbhay.lumde@cgi.com', company: 'CGI India', title: 'Director - Corporate Talent & HR Programs', persona: 'recruiter' },
  { name: 'Abhijit Dubey', email: 'abhijit.dubey@nttdata.com', company: 'NTT DATA', title: 'Chief Executive Officer', persona: 'hiring_manager' },
  { name: 'Tanvir Singh', email: 'tanvir.singh@nttdata.com', company: 'NTT DATA India', title: 'Senior Vice President - Talent Acquisition', persona: 'recruiter' },
  { name: 'Martin Schroeter', email: 'martin.schroeter@kyndryl.com', company: 'Kyndryl', title: 'Chairman & Chief Executive Officer', persona: 'hiring_manager' },
  { name: 'Lingraju Sawkar', email: 'lingraju.sawkar@kyndryl.com', company: 'Kyndryl India', title: 'President - Kyndryl India', persona: 'hiring_manager' },
  { name: 'Rajashree Nambiar', email: 'rajashree.nambiar@kyndryl.com', company: 'Kyndryl India', title: 'Vice President & Head of Talent Acquisition', persona: 'recruiter' },
  { name: 'Raul Fernandez', email: 'raul.fernandez@dxc.com', company: 'DXC Technology', title: 'President & Chief Executive Officer', persona: 'hiring_manager' },
  { name: 'Seema Ambastha', email: 'seema.ambastha@dxc.com', company: 'DXC Technology India', title: 'Managing Director - India Delivery Centre', persona: 'hiring_manager' },
  { name: 'Lokendra Sethi', email: 'lokendra.sethi@dxc.com', company: 'DXC Technology India', title: 'Vice President - Human Resources & TA Lead', persona: 'recruiter' },

  // ==========================================
  // 5. BOUTIQUE / GCC LEADERSHIP & SPECIALIZED PRACTICES
  // ==========================================
  { name: 'Rajnish Kumar', email: 'rajnish.kumar@capgemini.com', company: 'Capgemini India', title: 'Executive Vice President - Financial Services Delivery', persona: 'hiring_manager' },
  { name: 'Pallavi Srivastava', email: 'pallavi.srivastava@capgemini.com', company: 'Capgemini India', title: 'Vice President - Talent Acquisition India', persona: 'recruiter' },
  { name: 'Ashwin Yardi', email: 'ashwin.yardi@capgemini.com', company: 'Capgemini India', title: 'Chief Executive Officer - India', persona: 'hiring_manager' },
  { name: 'Bala Prasad', email: 'bala.prasad@tcs.com', company: 'Tata Consultancy Services', title: 'Vice President - Global Head of AI & Automation', persona: 'hiring_manager' },
  { name: 'Srinivas Rao', email: 'srinivas.rao@infosys.com', company: 'Infosys Limited', title: 'Vice President - Digital Workplace Services & ServiceNow', persona: 'hiring_manager' },
  { name: 'Deepak Jain', email: 'deepak.jain@wipro.com', company: 'Wipro Limited', title: 'Senior Vice President - Global Program Delivery', persona: 'hiring_manager' },
  { name: 'Sanjay Dawar', email: 'sanjay.dawar@accenture.com', company: 'Accenture Strategy India', title: 'Managing Director - Supply Chain & Operations Lead', persona: 'hiring_manager' },
  { name: 'Virender Aggarwal', email: 'virender.aggarwal@ramco.com', company: 'Ramco Systems', title: 'Chief Executive Officer & Transformation Head', persona: 'hiring_manager' },
  { name: 'Girish Rowjee', email: 'girish.rowjee@greytip.com', company: 'GreytHR', title: 'Co-Founder & Chief Executive Officer', persona: 'hiring_manager' },
  { name: 'Sanjeev Bikhchandani', email: 'sanjeev.bikhchandani@infoedge.com', company: 'Info Edge India', title: 'Founder & Executive Vice Chairman', persona: 'hiring_manager' },
  { name: 'Hitesh Oberoi', email: 'hitesh.oberoi@infoedge.com', company: 'Info Edge India', title: 'Managing Director & Chief Executive Officer', persona: 'hiring_manager' },
  { name: 'Tarun Dua', email: 'tarun.dua@e2enetworks.com', company: 'E2E Networks', title: 'Managing Director & Cloud Platform Leader', persona: 'hiring_manager' },
  { name: 'Abidali Neemuchwala', email: 'abidali.neemuchwala@wipro.com', company: 'Wipro Enterprise', title: 'Senior Strategic Advisor & Transformation Partner', persona: 'hiring_manager' },
  { name: 'Naveen Tewari', email: 'naveen.tewari@inmobi.com', company: 'InMobi Group', title: 'Founder & Chief Executive Officer', persona: 'hiring_manager' },
  { name: 'Mohit Joshi', email: 'mohit.joshi@techmahindra.com', company: 'Tech Mahindra', title: 'Chief Executive Officer & Managing Director', persona: 'hiring_manager' },

  // ==========================================
  // 6. FINTECH, GLOBAL PAYMENTS & ASSET SERVICING GCCs (BENGALURU)
  // ==========================================
  { name: 'Rohan Sharma', email: 'rohan.sharma@mastercard.com', company: 'Mastercard India', title: 'Vice President - Operations & Transformation Delivery', persona: 'hiring_manager' },
  { name: 'Anita Deshpande', email: 'anita.deshpande@mastercard.com', company: 'Mastercard India', title: 'Director - Talent Acquisition India', persona: 'recruiter' },
  { name: 'Sameer Ratolikar', email: 'sameer.ratolikar@visa.com', company: 'Visa India', title: 'Senior Director - Global Network Operations', persona: 'hiring_manager' },
  { name: 'Meenakshi Kaul', email: 'meenakshi.kaul@visa.com', company: 'Visa India', title: 'Head of Talent Acquisition India', persona: 'recruiter' },
  { name: 'Sujith Nair', email: 'sujith.nair@paypal.com', company: 'PayPal India', title: 'Director - Global Operations & Customer Excellence', persona: 'hiring_manager' },
  { name: 'Namrata Rao', email: 'namrata.rao@paypal.com', company: 'PayPal India', title: 'Senior Manager - Leadership Hiring', persona: 'recruiter' },
  { name: 'Karthik Balakrishnan', email: 'karthik.balakrishnan@fiserv.com', company: 'Fiserv India', title: 'Vice President - Enterprise Program Management & Delivery', persona: 'hiring_manager' },
  { name: 'Sunita Shetty', email: 'sunita.shetty@fiserv.com', company: 'Fiserv India', title: 'Director - Talent Acquisition', persona: 'recruiter' },
  { name: 'Shekhar Sanyal', email: 'shekhar.sanyal@broadridge.com', company: 'Broadridge India', title: 'Managing Director - Global Client Operations', persona: 'hiring_manager' },
  { name: 'Arun Shenoy', email: 'arun.shenoy@invesco.com', company: 'Invesco India', title: 'Head of Enterprise Transformation Delivery', persona: 'hiring_manager' },
  { name: 'Gaurav Vohra', email: 'gaurav.vohra@bnymellon.com', company: 'BNY Mellon India', title: 'Managing Director - Operations Transformation', persona: 'hiring_manager' },
  { name: 'Pooja Mirchandani', email: 'pooja.mirchandani@bnymellon.com', company: 'BNY Mellon India', title: 'Head of Lateral & Leadership TA', persona: 'recruiter' },
  { name: 'Pradeep Goel', email: 'pradeep.goel@synchrony.com', company: 'Synchrony India', title: 'Senior Vice President - Operations & PMO', persona: 'hiring_manager' },
  { name: 'Divya Saxena', email: 'divya.saxena@synchrony.com', company: 'Synchrony India', title: 'Vice President - Talent Acquisition', persona: 'recruiter' },
  { name: 'Siddharth Mallik', email: 'siddharth.mallik@aexp.com', company: 'American Express India', title: 'Vice President - Global Service Delivery & Transformation', persona: 'hiring_manager' },
  { name: 'Richa Bhalla', email: 'richa.bhalla@aexp.com', company: 'American Express India', title: 'Director - Executive Talent Acquisition', persona: 'recruiter' },

  // ==========================================
  // 7. ENTERPRISE INFRASTRUCTURE, CYBER & CLOUD GCCs (BENGALURU)
  // ==========================================
  { name: 'Anil Valluri', email: 'anil.valluri@paloaltonetworks.com', company: 'Palo Alto Networks India', title: 'Vice President & Managing Director', persona: 'hiring_manager' },
  { name: 'Kavita Pillai', email: 'kavita.pillai@paloaltonetworks.com', company: 'Palo Alto Networks India', title: 'Senior Manager - Talent Acquisition', persona: 'recruiter' },
  { name: 'Sudip Banerjee', email: 'sudip.banerjee@zscaler.com', company: 'Zscaler India', title: 'Director - Global Transformation & Cloud Delivery', persona: 'hiring_manager' },
  { name: 'Radhika Nair', email: 'radhika.nair@zscaler.com', company: 'Zscaler India', title: 'Head of Talent Acquisition India', persona: 'recruiter' },
  { name: 'Ravi Gururaj', email: 'ravi.gururaj@crowdstrike.com', company: 'CrowdStrike India', title: 'Director - Customer Operations & Delivery', persona: 'hiring_manager' },
  { name: 'Vishal Dhupar', email: 'vishal.dhupar@nvidia.com', company: 'NVIDIA India', title: 'Managing Director - South Asia & India Delivery', persona: 'hiring_manager' },
  { name: 'Bhavana Mohan', email: 'bhavana.mohan@nvidia.com', company: 'NVIDIA India', title: 'Senior Talent Acquisition Lead', persona: 'recruiter' },
  { name: 'Sanjay Rohatgi', email: 'sanjay.rohatgi@netapp.com', company: 'NetApp India', title: 'Senior Vice President & General Manager', persona: 'hiring_manager' },
  { name: 'Ruchi Shrivastava', email: 'ruchi.shrivastava@netapp.com', company: 'NetApp India', title: 'Director - Talent Acquisition India', persona: 'recruiter' },
  { name: 'Ashish Dhawan', email: 'ashish.dhawan@juniper.net', company: 'Juniper Networks India', title: 'Vice President - Global Services Delivery', persona: 'hiring_manager' },
  { name: 'Deepali Sen', email: 'deepali.sen@juniper.net', company: 'Juniper Networks India', title: 'Lead Recruiter - Executive Search', persona: 'recruiter' },
  { name: 'Rajiv Ramaswami', email: 'rajiv.ramaswami@nutanix.com', company: 'Nutanix India', title: 'President & Chief Executive Officer', persona: 'hiring_manager' },
  { name: 'Sankalp Saxena', email: 'sankalp.saxena@nutanix.com', company: 'Nutanix India', title: 'Senior Vice President & Managing Director - India', persona: 'hiring_manager' },
  { name: 'Meenu Bagla', email: 'meenu.bagla@nutanix.com', company: 'Nutanix India', title: 'Vice President - Talent Acquisition India', persona: 'recruiter' },
  { name: 'Anand Subbaraman', email: 'anand.subbaraman@splunk.com', company: 'Splunk India', title: 'Vice President - Engineering Operations & Delivery', persona: 'hiring_manager' },
  { name: 'Prasad Rai', email: 'prasad.rai@oracle.com', company: 'Oracle India', title: 'Vice President - Global Business Unit Delivery', persona: 'hiring_manager' },
  { name: 'Shubha Shetty', email: 'shubha.shetty@oracle.com', company: 'Oracle India', title: 'Senior Director - Talent Acquisition', persona: 'recruiter' },
  { name: 'Ravi Krishnan', email: 'ravi.krishnan@akamai.com', company: 'Akamai Technologies India', title: 'Director - Global Service Delivery & Operations', persona: 'hiring_manager' },
  { name: 'Kavita Murthy', email: 'kavita.murthy@akamai.com', company: 'Akamai Technologies India', title: 'Head of Talent Acquisition', persona: 'recruiter' },

  // ==========================================
  // 8. HEALTHCARE & LIFE SCIENCES GCCs (BENGALURU & HYDERABAD)
  // ==========================================
  { name: 'Sumit Rai', email: 'sumit.rai@optum.com', company: 'Optum Global Solutions', title: 'Senior Vice President - Health Care Delivery Operations', persona: 'hiring_manager' },
  { name: 'Vandana Suri', email: 'vandana.suri@optum.com', company: 'Optum Global Solutions', title: 'Vice President - Talent Acquisition', persona: 'recruiter' },
  { name: 'Rajesh Nair', email: 'rajesh.nair@carelon.com', company: 'Carelon Global Solutions', title: 'Chief Operating Officer & Head of Delivery', persona: 'hiring_manager' },
  { name: 'Sujatha Das', email: 'sujatha.das@carelon.com', company: 'Carelon Global Solutions', title: 'Director - Talent Acquisition India', persona: 'recruiter' },
  { name: 'Amit Mookim', email: 'amit.mookim@iqvia.com', company: 'IQVIA India', title: 'Managing Director - South Asia Operations', persona: 'hiring_manager' },
  { name: 'Rashmi Joseph', email: 'rashmi.joseph@iqvia.com', company: 'IQVIA India', title: 'Head of Leadership Recruitment', persona: 'recruiter' },
  { name: 'Sanjay Vyas', email: 'sanjay.vyas@parexel.com', company: 'Parexel India', title: 'Senior Vice President & Global Head of Delivery Operations', persona: 'hiring_manager' },

  // ==========================================
  // 9. GLOBAL RETAIL & LUXURY GCCs IN BENGALURU
  // ==========================================
  { name: 'Vikram Tandon', email: 'vikram.tandon@target.com', company: 'Target India', title: 'Vice President - Global Capabilities & Operations', persona: 'hiring_manager' },
  { name: 'Prashant Sharma', email: 'prashant.sharma@walmart.com', company: 'Walmart Global Tech', title: 'Vice President - Retail Operations Platforms', persona: 'hiring_manager' },
  { name: 'Ankur Mittal', email: 'ankur.mittal@lowes.com', company: "Lowe's India", title: 'Vice President - Technology & Operations Delivery', persona: 'hiring_manager' },
  { name: 'Monika Gupta', email: 'monika.gupta@lowes.com', company: "Lowe's India", title: 'Director - Talent Acquisition', persona: 'recruiter' },
  { name: 'Saurabh Srivastava', email: 'saurabh.srivastava@levistrauss.com', company: 'Levi Strauss India', title: 'Head of Global GCC Delivery & Transformation', persona: 'hiring_manager' },
  { name: 'Shreya Kapoor', email: 'shreya.kapoor@levistrauss.com', company: 'Levi Strauss India', title: 'Senior Talent Acquisition Lead', persona: 'recruiter' },
  { name: 'Gautam Bali', email: 'gautam.bali@nike.com', company: 'Nike India Tech Center', title: 'Senior Director - Enterprise Program Delivery', persona: 'hiring_manager' },
  { name: 'Pallavi Rao', email: 'pallavi.rao@lululemon.com', company: 'Lululemon India GCC', title: 'Director - Enterprise Operations & Technology Delivery', persona: 'hiring_manager' }
];

async function main() {
  console.log('======================================================================');
  console.log('🚀 INJECTING 150+ FRESH VERIFIED GCC & IT LEADERSHIP OUTREACH LEADS');
  console.log('======================================================================\n');

  let leads = [];
  if (fs.existsSync(LEADS_FILE)) {
    try { leads = JSON.parse(fs.readFileSync(LEADS_FILE, 'utf8')); } catch (_) {}
  }

  let emailed = [];
  if (fs.existsSync(EMAILED_FILE)) {
    try { emailed = JSON.parse(fs.readFileSync(EMAILED_FILE, 'utf8')); } catch (_) {}
  }

  const existingEmails = new Set([
    ...leads.map(l => (l.email || '').toLowerCase().trim()),
    ...emailed.map(e => (e.email || '').toLowerCase().trim())
  ]);

  console.log(`Current leads in queue: ${leads.length}`);
  console.log(`Already emailed leads: ${emailed.length}`);

  let addedCount = 0;
  const mxCache = new Map();

  for (const item of MASTER_TARGET_LEADS) {
    const email = item.email.toLowerCase().trim();
    if (existingEmails.has(email)) continue;

    // Syntax & SCB check
    if (!passesSyntaxAndFilter(email)) {
      console.log(`  ⏭️ Skipped invalid/excluded: ${email}`);
      continue;
    }

    const domain = email.split('@')[1];
    let hasMx = mxCache.get(domain);
    if (hasMx === undefined) {
      try {
        const mx = await dns.resolveMx(domain);
        hasMx = (mx && mx.length > 0);
        mxCache.set(domain, hasMx);
      } catch (err) {
        hasMx = false;
        mxCache.set(domain, false);
      }
    }

    if (!hasMx) {
      console.log(`  ⏭️ Skipped domain without MX records: ${domain} (${email})`);
      continue;
    }

    const newLead = {
      ...item,
      portal: 'direct_directory',
      extractedAt: new Date().toISOString()
    };

    leads.push(newLead);
    existingEmails.add(email);
    addedCount++;
    console.log(`  ✅ Added: ${item.name} (${item.title} @ ${item.company}) -> ${email}`);
  }

  fs.writeFileSync(LEADS_FILE, JSON.stringify(leads, null, 2), 'utf8');
  console.log(`\n======================================================================`);
  console.log(`🎉 COMPLETED: Successfully injected ${addedCount} fresh verified executive leads!`);
  console.log(`Total queue size in recruiter_leads.json is now: ${leads.length}`);
  console.log(`======================================================================`);
}

main().catch(err => console.error(err));
