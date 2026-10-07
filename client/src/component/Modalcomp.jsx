const Modalcomp = ({ message }) => {
  return (
    <div
      className="modal fade"
      id="exampleModal"
      tabIndex="-1"
      aria-labelledby="exampleModalLabel"
      aria-hidden="true"
    >
      <div className="modal-dialog modal-dialog-centered">

        <div className="modal-content">

          <div className="modal-header">

            <h5
              className="modal-title"
              id="exampleModalLabel"
            >
              Error
            </h5>

            <button
              type="button"
              className="btn-close"
              data-bs-dismiss="modal"
              aria-label="Close"
            ></button>

          </div>

          <div className="modal-body">
            {message}
          </div>

          <div className="modal-footer">

            <button
              type="button"
              className="btn btn-secondary"
              data-bs-dismiss="modal"
            >
              Close
            </button>

          </div>

        </div>

      </div>
    </div>
  );
};

export default Modalcomp;