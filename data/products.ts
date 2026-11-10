export type Product = { slug: string; name: string; category: string; description: string; price: number; icon: string; image?: string; imageAlt?: string };

export const products: Product[] = [
 {slug:"model-mock-papers",name:"Model Mock Papers",category:"Mock Papers",description:"Practice papers to help learners prepare with confidence.",price:250,icon:"📘"},
 {slug:"revision-materials",name:"Revision Materials",category:"Revision",description:"Revision booklets and subject-focused study materials.",price:180,icon:"📚"},
 {slug:"school-exam-papers",name:"School Exam Papers",category:"Exam Papers",description:"Internal assessment papers for schools and learning institutions.",price:150,icon:"📝"},
 {slug:"school-stationery",name:"School Supplies",category:"Supplies",description:"Essential stationery and learning resources for classrooms.",price:100,icon:"✏️"},
 {slug:"custom-printing",name:"Custom Printing",category:"Printing",description:"Printing and finishing tailored to your school's requirements.",price:0,icon:"🖨️"},
 {slug:"assessment-tools",name:"Assessment Tools",category:"Assessment",description:"Educational assessment resources for teachers and schools.",price:200,icon:"📋"},
 {slug:"kcse-revision",name:"KCSE Revision Pack",category:"Revision",description:"Revision resources for KCSE preparation; not official exam papers.",price:350,icon:"🎓"},
 {slug:"kjsea-revision",name:"KJSEA Revision Pack",category:"Revision",description:"Practice and revision resources for KJSEA preparation.",price:300,icon:"📖"},
 {slug:"graduation-gowns-pp2",name:"Graduation Gown Hire – PP2",category:"Graduation",description:"Graduation gowns for hire for PP2 graduation ceremonies.",price:0,icon:"🎓"},
 {slug:"graduation-gowns-grade-3",name:"Graduation Gown Hire – Grade 3",category:"Graduation",description:"Graduation gowns for hire for Grade 3 graduation ceremonies.",price:0,icon:"🎓"},
 {slug:"graduation-gowns-grade-6",name:"Graduation Gown Hire – Grade 6",category:"Graduation",description:"Graduation gowns for hire for Grade 6 graduation ceremonies.",price:0,icon:"🎓"},
 {slug:"graduation-gowns-grade-9",name:"Graduation Gown Hire – Grade 9",category:"Graduation",description:"Graduation gowns for hire for Grade 9 graduation ceremonies.",price:0,icon:"🎓"},
 {slug:"certificate-printing",name:"Certificates for Graduates",category:"Graduation",description:"Graduation certificates, laminated free of charge.",price:0,icon:"📜"},
 {slug:"lamination-photocopying",name:"Lamination & Photocopying",category:"Printing",description:"Lamination and photocopying, from single pages to bulk jobs.",price:0,icon:"🗂️"},
 {slug:"office-stationery",name:"Office Stationery",category:"Stationery",description:"Office stationery for businesses, schools and individuals.",price:0,icon:"🖇️"},
 {slug:"supergro-fertilizer",name:"Supergro Organic Fertiliser",category:"Agriculture",description:"Supergro organic fertiliser for farmers and gardeners.",price:0,icon:"🌱",image:"/shop-shelves.webp",imageAlt:"Super Gro bottles on the shelf at Oria Exam Supplies"}
];