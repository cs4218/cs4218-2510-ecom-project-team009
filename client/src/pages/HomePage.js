import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Checkbox, Radio } from "antd";
import { Prices } from "../components/Prices";
import { useCart } from "../context/cart";
import axios from "axios";
import toast from "react-hot-toast";
import Layout from "./../components/Layout";
import { AiOutlineReload } from "react-icons/ai";
import "../styles/Homepages.css";
import { useAuth } from "../context/auth";

const HomePage = () => {
  const navigate = useNavigate();
  const [cart, setCart] = useCart();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [checked, setChecked] = useState([]);
  const [radio, setRadio] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [auth] = useAuth();
  const userId = auth?.user?._id || "guest";

  //get all cat
  const getAllCategory = async () => {
    try {
      const { data } = await axios.get("/api/v1/category/get-category");
      if (data?.success) {
        setCategories(data?.category);
      }
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    getAllCategory();
    getTotal();
  }, []);
  //get products
  const getAllProducts = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(`/api/v1/product/product-list/${page}`);
      setLoading(false);
      setProducts(data.products);
    } catch (error) {
      setLoading(false);
      console.log(error);
    }
  };

  //getTOtal COunt
  const getTotal = async () => {
    try {
      const { data } = await axios.get("/api/v1/product/product-count");
      setTotal(data?.total);
    } catch (error) {
      console.log(error);
    }
  };

  // useEffect(() => {
  //   if (page === 1) return;
  //   loadMore();
  // }, [page]);
  //load more
  const loadMore = async () => {
    try {
      setLoading(true);
      const nextPage = page + 1;
      const { data } = await axios.get(`/api/v1/product/product-list/${nextPage}`);
      setLoading(false);
      setProducts([...products, ...data?.products]);
      setPage(nextPage);  // Increment page AFTER successful load
    } catch (error) {
      console.log(error);
      setLoading(false);
    }
  };

  // filter by cat
  const handleFilter = (value, id) => {
    let all = [...checked];
    if (value) {
      all.push(id);
    } else {
      all = all.filter((c) => c !== id);
    }
    setChecked(all);
  };
  useEffect(() => {
    if (!checked.length && !radio.length) {
      console.log("fetching all products");
      getAllProducts();
    }
  }, [checked.length, radio.length]);

  useEffect(() => {
    if (checked.length || radio.length) filterProduct();
  }, [checked, radio]);

  //get filterd product
  const filterProduct = async () => {
    try {
      const { data } = await axios.post("/api/v1/product/product-filters", {
        checked,
        radio,
      });
      setProducts(data?.products);
      setTotal(data?.products.length);
    } catch (error) {
      console.log(error);
    }
  };
  return (
    <Layout title={"ALL Products - Best offers "}>
      {/* banner image */}
      <img
        src="/images/Virtual.png"
        className="banner-img"
        alt="bannerimage"
        width={"100%"}
      />
      {/* banner image */}
      <div className="container-fluid row mt-3 home-page">
        <div className="col-md-3 filters">
          <h4 className="text-center mt-4">Filter By Category</h4>
          <div className="d-flex flex-column">
            {categories?.map((c) => (
              <Checkbox
                key={c._id}
                onChange={(e) => handleFilter(e.target.checked, c._id)}
                className="filter-checkbox"
              >
                {c.name}
              </Checkbox>
            ))}
          </div>
          {/* price filter */}
          <h4 className="text-center mt-4">Filter By Price</h4>
          <div className="d-flex flex-column">
            {Prices?.map((p) => (
              <Checkbox
                key={p._id}
                checked={JSON.stringify(radio) === JSON.stringify(p.array)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setRadio(p.array);
                  } else {
                    setRadio([]);
                  }
                }}
                className="filter-checkbox"
              >
                {p.name}
              </Checkbox>
            ))}
          </div>
          <div className="d-flex flex-column">
            <button
              className="btn btn-danger"
              onClick={() => {
                setChecked([]);
                setRadio([]);
                setPage(1);
                getAllProducts();
              }}
            >
              RESET FILTERS
            </button>
          </div>
        </div>
        <div className="col-md-9 ">
          <h1 className="text-center">All Products</h1>
          <div className="d-flex flex-wrap">
            {products?.map((p) => (
              <div className="card m-2" key={p._id}>
                <img
                  src={`/api/v1/product/product-photo/${p._id}`}
                  className="card-img-top"
                  alt={p.name}
                  loading="lazy"
                />
                <div className="card-body">
                  <div className="card-name-price">
                    <h5 className="card-title">{p.name}</h5>
                    <h5 className="card-title card-price">
                      {p.price.toLocaleString("en-US", {
                        style: "currency",
                        currency: "USD",
                      })}
                    </h5>
                  </div>
                  <p className="card-text ">
                    {p.description.substring(0, 60)}...
                  </p>
                  <div className="card-name-price">
                    <button
                      className="btn btn-info"
                      style={{ flex: 1, marginRight: '4px' }}
                      onClick={() => navigate(`/product/${p.slug}`)}
                    >
                      Details
                    </button>
                    <button
                      className="btn btn-dark"
                      style={{ flex: 1, marginLeft: '4px' }}
                      onClick={() => {
                        setCart([...cart, p]);
                        const userId = auth?.user?._id || "guest";
                        localStorage.setItem(
                          `cart_${userId}`,
                          JSON.stringify([...cart, p])
                        );
                        toast.success("Item Added to cart");
                      }}
                    >
                      Add to Cart
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="m-2 p-3">
            {products && products.length < total && (
              <button
                className="btn loadmore"
                onClick={(e) => {
                  e.preventDefault();
                  loadMore();  // Just call loadMore, it handles page increment
                }}
              >
                {loading ? "Loading ..." : (
                  <>
                    Loadmore <AiOutlineReload />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
      <style jsx>{`
        /* Add these styles at the end */

        .home-page .d-flex.flex-wrap {
          align-items: stretch; /* Make all cards same height */
          display: flex !important;
          flex-wrap: wrap !important;
        }

        .home-page .card.m-2 {
          display: flex !important;
          flex-direction: column !important;
          width: 18rem !important;
          height: 32rem !important; /* FIXED HEIGHT */
          margin: 0.5rem !important;
        }

        .home-page .card-img-top {
          height: 300px !important; /* Fixed image height */
          object-fit: cover !important;
        }

        .home-page .card-body {
          display: flex !important;
          flex-direction: column !important;
          flex: 1 !important;
          padding: 1rem !important;
        }

        .home-page .card-title {
          min-height: 3rem !important; /* Reserve space for 2-line titles */
          margin-bottom: 0.5rem !important;
        }

        .home-page .card-text {
          flex: 1 !important;
          margin-bottom: 1rem !important;
        }

        .home-page .card-name-price:last-child {
          margin-top: auto !important; /* Push buttons to bottom */
        }

        .filter-checkbox {
          display: flex !important;
          align-items: center !important;
          margin-left: 0 !important;
          width: 100% !important;
        }

        .filter-checkbox > span {
          display: inline !important;
        }
      `}</style>
    </Layout>
  );
};

export default HomePage;
