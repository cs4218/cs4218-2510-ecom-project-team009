import React, { useState } from "react";
import Layout from "./../../components/Layout";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import "../../styles/AuthStyles.css";
const Register = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [DOB, setDOB] = useState("");
  const [answer, setAnswer] = useState("");
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();

  // form function
  const handleSubmit = async (e) => {
    e.preventDefault();
    // bug diego: added basic validations for name, email, password, phone, address, DOB, answer

    // Validation
    const newErrors = {};

    if (!name.trim()) {
      newErrors.name = "Name is required";
    } else if (name.trim().length < 2) {
      newErrors.name = "Name must be at least 2 characters";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      newErrors.email = "Enter a valid email address";
    }

    if (password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }

    const phoneDigits = phone.replace(/\D/g, "");
    if (phoneDigits.length < 10 || phoneDigits.length > 15) {
      newErrors.phone = "Enter a valid phone number (10-15 digits)";
    }

    if (!address.trim()) {
      newErrors.address = "Address is required";
    } else if (address.trim().length < 5) {
      newErrors.address = "Address must be at least 5 characters";
    }

    if (!DOB) {
      newErrors.DOB = "Date of birth is required";
    } else {
      const selectedDate = new Date(DOB);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selectedDate > today) {
        newErrors.DOB = "Date of birth cannot be in the future";
      }
    }

    if (!answer.trim()) {
      newErrors.answer = "Security answer is required";
    } else if (answer.trim().length < 3) {
      newErrors.answer = "Security answer must be at least 3 characters";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});

    try {
      const res = await axios.post("/api/v1/auth/register", {
        name,
        email,
        password,
        phone,
        address,
        DOB,
        answer,
      });
      if (res && res.data.success) {
        toast.success("Register successful, please login");
        navigate("/login");
      } else {
        toast.error(res.data.message);
      }
    } catch (error) {
      console.log(error);
      toast.error("Something went wrong");
    }
  };

  return (
    <Layout title="Register - Ecommerce App">
      <div className="form-container" style={{ minHeight: "90vh" }}>
        <form onSubmit={handleSubmit}>
          <h4 className="title">REGISTER FORM</h4>
          <div className="mb-3">
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setErrors({ ...errors, name: "" });
              }}
              className="form-control"
              id="exampleInputName1"
              placeholder="Enter your name"
              // required
              autoFocus
            />
            {errors.name && (
              <small className="text-danger">{errors.name}</small>
            )}
          </div>
          <div className="mb-3">
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setErrors({ ...errors, email: "" });
              }}
              className="form-control"
              id="exampleInputEmail1"
              placeholder="Enter your email"
              // required
            />
            {errors.email && (
              <small className="text-danger">{errors.email}</small>
            )}
          </div>
          <div className="mb-3">
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setErrors({ ...errors, password: "" });
              }}
              className="form-control"
              id="exampleInputPassword1"
              placeholder="Enter your password"
              // required
            />
            {errors.password && (
              <small className="text-danger">{errors.password}</small>
            )}
          </div>
          <div className="mb-3">
            <input
              type="text"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                setErrors({ ...errors, phone: "" });
              }}
              className="form-control"
              id="exampleInputPhone1"
              placeholder="Enter your phone"
              // required
            />
            {errors.phone && (
              <small className="text-danger">{errors.phone}</small>
            )}
          </div>
          <div className="mb-3">
            <input
              type="text"
              value={address}
              onChange={(e) => {
                setAddress(e.target.value);
                setErrors({ ...errors, address: "" });
              }}
              className="form-control"
              id="exampleInputaddress1"
              placeholder="Enter your address"
              // required
            />
            {errors.address && (
              <small className="text-danger">{errors.address}</small>
            )}
          </div>
          <div className="mb-3">
            <input
              type="Date"
              value={DOB}
              onChange={(e) => {
                setDOB(e.target.value);
                setErrors({ ...errors, DOB: "" });
              }}
              className="form-control"
              id="exampleInputDOB1"
              placeholder="Enter your DOB"
              // required
            />
            {errors.DOB && <small className="text-danger">{errors.DOB}</small>}
          </div>
          <div className="mb-3">
            <input
              type="text"
              value={answer}
              onChange={(e) => {
                setAnswer(e.target.value);
                setErrors({ ...errors, answer: "" });
              }}
              className="form-control"
              id="exampleInputanswer1"
              placeholder="What is your favorite sport"
              // required
            />
            {errors.answer && (
              <small className="text-danger">{errors.answer}</small>
            )}
          </div>
          <button type="submit" className="btn btn-primary">
            REGISTER
          </button>
        </form>
      </div>
    </Layout>
  );
};

export default Register;
