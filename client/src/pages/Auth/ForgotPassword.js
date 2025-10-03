import React, { useState } from "react";
import Layout from "./../../components/Layout";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [answer, setAnswer] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [errors, setErrors] = useState({});
  // form function
  const handleSubmit = async (e) => {};

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
            FORGOT PASSWORD
          </button>
        </form>
      </div>
    </Layout>
  );
};

export default ForgotPassword;
