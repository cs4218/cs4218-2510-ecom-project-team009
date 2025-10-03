import React, { useState } from "react";
import Layout from "./../../components/Layout";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import "../../styles/AuthStyles.css";
// bug diego: added forgot password page
const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [answer, setAnswer] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();

  // form function
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    const newErrors = {};

    if (!email) {
      newErrors.email = "Email is required";
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        newErrors.email = "Enter a valid email address";
      }
    }

    if (!answer) {
      newErrors.answer = "Security answer is required";
    } else {
      if (answer.trim().length < 3) {
        newErrors.answer = "Security answer must be at least 3 characters";
      }
    }

    if (!newPassword) {
      newErrors.newPassword = "New password is required";
    } else {
      if (newPassword.trim().length < 6) {
        newErrors.newPassword = "New password must be at least 6 characters";
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});

    try {
      const res = await axios.post("/api/v1/auth/forgot-password", {
        email,
        answer,
        newPassword,
      });
      if (res.data.success) {
        toast.success("Password reset successfully");
        navigate("/login");
      } else {
        toast.error(res.data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <Layout title="Forgot Password">
      <div className="form-container" style={{ minHeight: "90vh" }}>
        <form onSubmit={handleSubmit}>
          <h4 className="title">FORGOT PASSWORD</h4>
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
              required
            />
            {errors.email && (
              <small className="text-danger">{errors.email}</small>
            )}
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
              id="exampleInputAnswer1"
              placeholder="Enter your answer"
              required
            />
            {errors.answer && (
              <small className="text-danger">{errors.answer}</small>
            )}
          </div>
          <div className="mb-3">
            <input
              type="password"
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                setErrors({ ...errors, newPassword: "" });
              }}
              className="form-control"
              id="exampleInputNewPassword1"
              placeholder="Enter your new password"
              required
            />
            {errors.newPassword && (
              <small className="text-danger">{errors.newPassword}</small>
            )}
          </div>
          <button type="submit" className="btn btn-primary">
            RESET PASSWORD
          </button>
        </form>
      </div>
    </Layout>
  );
};

export default ForgotPassword;
